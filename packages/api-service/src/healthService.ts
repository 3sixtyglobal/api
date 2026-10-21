// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	type IHealth,
	type IHealthComponent,
	HealthStatus,
	type IHealthProviderComponent
} from "@3sixty/api-models";
import type { IBackgroundTask, IBackgroundTaskComponent } from "@3sixty/background-task-models";
import { TaskStatus } from "@3sixty/background-task-models";
import type { IContextIds } from "@3sixty/context";
import { BaseError, ComponentFactory, Factory, type IComponent, Is } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { ModuleHelper } from "@3sixty/modules";
import { nameof } from "@3sixty/nameof";
import type { IHealthServiceConstructorOptions } from "./models/IHealthServiceConstructorOptions.js";

/**
 * The health service for the server.
 */
export class HealthService implements IHealthComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<HealthService>();

	/**
	 * Task type identifier for the application health background task.
	 * @internal
	 */
	private static readonly _APPLICATION_HEALTH_TASK_TYPE: string = "health-application-check";

	/**
	 * The server health.
	 * @internal
	 */
	private _healthInfo: {
		status: HealthStatus;
		components: IHealth[];
	};

	/**
	 * The interval for checking the health of the components.
	 * @internal
	 */
	private readonly _healthCheckInterval: number;

	/**
	 * The interval for running the application health lifecycle (init, application, teardown).
	 * @internal
	 */
	private readonly _healthApplicationCheckInterval: number;

	/**
	 * The initial interval for checking the health of the components.
	 * This is used to check the health of the components immediately after the service is started.
	 * @internal
	 */
	private readonly _initialInterval: number;

	/**
	 * Timer for the regular health check.
	 * @internal
	 */
	private _healthTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

	/**
	 * Timer for the application health lifecycle.
	 * @internal
	 */
	private _healthApplicationTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

	/**
	 * Whether the service has been started.
	 * @internal
	 */
	private _started: boolean;

	/**
	 * Health entries from the most recently completed regular health check.
	 * @internal
	 */
	private _regularComponents: IHealth[];

	/**
	 * Health entries from the most recently completed application health cycle.
	 * @internal
	 */
	private _applicationComponents: IHealth[];

	/**
	 * Whether to include stack traces in health check error details.
	 * @internal
	 */
	private readonly _includeErrorStack?: boolean;

	/**
	 * The background task component for running application health checks.
	 * @internal
	 */
	private readonly _backgroundTaskComponent: IBackgroundTaskComponent;

	/**
	 * The URL of the module to use for the application health background task.
	 * @internal
	 */
	private readonly _applicationHealthTaskHandler: string;

	/**
	 * Regular expression patterns for component types to exclude from the health engine clone,
	 * verified when the service is started.
	 * @internal
	 */
	private _excludeCloneComponents: string[] | undefined;

	/**
	 * Create a new instance of HealthService.
	 * @param options The constructor options.
	 */
	constructor(options?: IHealthServiceConstructorOptions) {
		this._healthInfo = { status: HealthStatus.Ok, components: [] };
		this._healthCheckInterval = options?.config?.healthCheckInterval ?? 60000;
		this._healthApplicationCheckInterval =
			options?.config?.healthCheckApplicationInterval ?? 300000;
		this._initialInterval = options?.config?.initialInterval ?? 2000;
		this._includeErrorStack = options?.config?.includeErrorStack;
		this._backgroundTaskComponent = ComponentFactory.get<IBackgroundTaskComponent>(
			options?.backgroundTaskComponentType ?? "background-task"
		);
		this._applicationHealthTaskHandler =
			options?.config?.overrideApplicationHealthTaskHandler ??
			new URL("./healthApplicationTask.js", import.meta.url).href;
		this._excludeCloneComponents = options?.config?.excludeCloneComponents;
		this._started = false;
		this._regularComponents = [];
		this._applicationComponents = [];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return HealthService.CLASS_NAME;
	}

	/**
	 * The component needs to be started when the node is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the initial health check timers have been scheduled.
	 * @throws GeneralError if an exclude clone component is not a valid regular expression.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		if (!this._started) {
			// Only load the engine models module when there is something to verify, so a node
			// with no configured exclusions never has to resolve it.
			if (Is.arrayValue(this._excludeCloneComponents)) {
				this._excludeCloneComponents = await ModuleHelper.execModuleMethod<string[] | undefined>(
					"@3sixty/engine-models",
					"EngineCloneHelper.verifyExcludeCloneComponents",
					[this._excludeCloneComponents]
				);
			}

			this._started = true;

			await this._backgroundTaskComponent.registerHandler<undefined, IHealth[]>(
				HealthService._APPLICATION_HEALTH_TASK_TYPE,
				this._applicationHealthTaskHandler,
				"healthApplicationTask",
				async (task: IBackgroundTask<undefined, IHealth[]>) => {
					if (
						task.status === TaskStatus.Success ||
						task.status === TaskStatus.Failed ||
						task.status === TaskStatus.Cancelled
					) {
						if (task.status === TaskStatus.Success && Is.array(task.result)) {
							this._applicationComponents = task.result;
							this.groupHealthByName([...this._regularComponents, ...this._applicationComponents]);
						} else if (task.status === TaskStatus.Failed) {
							const nodeLogging =
								ComponentFactory.getIfExists<ILoggingComponent>(nodeLoggingComponentType);
							await nodeLogging?.log({
								level: "error",
								source: HealthService.CLASS_NAME,
								message: "applicationHealthCheckTaskFailed",
								error: Is.object(task.error) ? BaseError.fromError(task.error) : undefined
							});
						}
						this.startApplicationTimer(this._healthApplicationCheckInterval);
					}
				},
				{
					idleShutdownTimeout: -1,
					initialiseMethod: "healthApplicationTaskStart",
					initialiseMethodParams: async () => [this._excludeCloneComponents],
					shutdownMethod: "healthApplicationTaskEnd"
				}
			);

			// Immediately check health after a startup settling period.
			// The interval for the next checks are triggered on success of the current
			// check to prevent overlapping checks in case of long running health checks.
			this.startTimer(nodeLoggingComponentType, this._initialInterval);
			this.startApplicationTimer(this._initialInterval);
		}
	}

	/**
	 * The component needs to be stopped when the node is closed.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the health check timers have been cancelled.
	 */
	public async stop(nodeLoggingComponentType?: string): Promise<void> {
		if (this._started) {
			this._started = false;
			this.stopTimer();
			this.stopApplicationTimer();

			await this._backgroundTaskComponent.unregisterHandler(
				HealthService._APPLICATION_HEALTH_TASK_TYPE
			);
		}
	}

	/**
	 * Get the server health.
	 * @returns The service health.
	 */
	public async healthStatus(): Promise<{ status: HealthStatus; components: IHealth[] }> {
		return this._healthInfo;
	}

	/**
	 * Check the health of all registered components by calling health() on each.
	 * @param nodeLoggingComponentType The node logging component type to log any errors that occur during health checks.
	 * @returns A promise that resolves when all component health checks are complete and the next check is scheduled.
	 * @internal
	 */
	private async checkHealth(nodeLoggingComponentType?: string): Promise<void> {
		this.stopTimer();

		const engineCoreFactory = Factory.getFactory("engine-core");

		if (engineCoreFactory) {
			// Use a replica of the IEngineCore interface to avoid a circular dependency on the engine-core package.
			const engineCore = engineCoreFactory.getIfExists<{
				getContextIds: () => IContextIds | undefined;
				getRegisteredComponents: () => Promise<
					{
						instanceType: string;
						component: IComponent;
					}[]
				>;
			}>("engine");

			if (engineCore) {
				const registeredInstances = await engineCore.getRegisteredComponents();
				const allHealth: IHealth[] = [];

				for (const registeredInstance of registeredInstances) {
					if (Is.object<IHealthProviderComponent>(registeredInstance.component)) {
						const healthMethod = registeredInstance.component.health?.bind(
							registeredInstance.component
						);
						if (Is.function(healthMethod)) {
							try {
								allHealth.push(...(await healthMethod()));
							} catch (error) {
								const nodeLogging =
									ComponentFactory.getIfExists<ILoggingComponent>(nodeLoggingComponentType);
								await nodeLogging?.log({
									level: "error",
									source: HealthService.CLASS_NAME,
									message: "componentHealthCheckFailed",
									data: { className: registeredInstance.component.className() },
									error: BaseError.fromError(error)
								});
							}
						}
					}
				}

				this._regularComponents = allHealth;
				this.groupHealthByName([...this._regularComponents, ...this._applicationComponents]);
				this.startTimer(nodeLoggingComponentType, this._healthCheckInterval);
			}
		}
	}

	/**
	 * Group raw health entries by name, collapsing duplicates into a parent with a grouped array.
	 * @param entries The flat list of health entries from all components.
	 * @internal
	 */
	private groupHealthByName(entries: IHealth[]): void {
		const bySource = new Map<string, IHealth[]>();
		for (const entry of entries) {
			const existing = bySource.get(entry.source) ?? [];
			existing.push({
				...entry,
				error: !Is.empty(entry.error)
					? BaseError.fromError(entry.error).toJsonObject(this._includeErrorStack)
					: undefined
			});
			bySource.set(entry.source, existing);
		}

		const result: IHealth[] = [];
		for (const [source, group] of bySource) {
			if (group.length > 1) {
				let parentStatus: HealthStatus = HealthStatus.Ok;

				if (group.some(e => e.status === HealthStatus.Error)) {
					parentStatus = HealthStatus.Error;
				} else if (group.some(e => e.status === HealthStatus.Warning)) {
					parentStatus = HealthStatus.Warning;
				}

				result.push({ source, status: parentStatus, grouped: group });
			} else {
				result.push(group[0]);
			}
		}

		let finalStatus: HealthStatus = HealthStatus.Ok;
		if (result.some(e => e.status === HealthStatus.Error)) {
			finalStatus = HealthStatus.Error;
		} else if (result.some(e => e.status === HealthStatus.Warning)) {
			finalStatus = HealthStatus.Warning;
		}

		this._healthInfo = { status: finalStatus, components: result };
	}

	/**
	 * Start the regular health check timer.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @param interval The interval for the timer.
	 * @internal
	 */
	private startTimer(nodeLoggingComponentType: string | undefined, interval: number): void {
		if (this._started) {
			this._healthTimer = globalThis.setTimeout(
				async () => this.checkHealth(nodeLoggingComponentType),
				interval
			);
		}
	}

	/**
	 * Stop the regular health check timer.
	 * @internal
	 */
	private stopTimer(): void {
		if (this._healthTimer) {
			globalThis.clearTimeout(this._healthTimer);
			this._healthTimer = undefined;
		}
	}

	/**
	 * Start the application health lifecycle timer.
	 * @param interval The interval for the timer.
	 * @internal
	 */
	private startApplicationTimer(interval: number): void {
		if (this._started) {
			this._healthApplicationTimer = globalThis.setTimeout(async () => {
				this.stopApplicationTimer();

				await this._backgroundTaskComponent.create(HealthService._APPLICATION_HEALTH_TASK_TYPE);
			}, interval);
		}
	}

	/**
	 * Stop the application health lifecycle timer.
	 * @internal
	 */
	private stopApplicationTimer(): void {
		if (this._healthApplicationTimer) {
			globalThis.clearTimeout(this._healthApplicationTimer);
			this._healthApplicationTimer = undefined;
		}
	}
}
