// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HealthStatus, type IHealth } from "@3sixty/api-models";
import type { IBackgroundTask } from "@3sixty/background-task-models";
import { TaskStatus } from "@3sixty/background-task-models";
import { ContextIdStore } from "@3sixty/context";
import { ComponentFactory, Factory, GeneralError } from "@3sixty/core";
import { ModuleHelper } from "@3sixty/modules";
import { HealthService } from "../src/healthService.js";

function makeComponent(...healthEntries: IHealth[]): {
	component: { className: () => string; health: () => Promise<IHealth[]> };
} {
	return {
		component: {
			className: vi.fn().mockReturnValue("MockComponent"),
			health: vi.fn().mockResolvedValue(healthEntries)
		}
	};
}

describe("HealthService", () => {
	let mockGetContextIds: ReturnType<typeof vi.fn>;
	let mockGetRegisteredComponents: ReturnType<typeof vi.fn>;
	let mockEngineCore: {
		getContextIds: ReturnType<typeof vi.fn>;
		getRegisteredComponents: ReturnType<typeof vi.fn>;
	};
	let mockFactory: Factory<unknown>;
	let mockBackgroundTaskComponent: {
		className: () => string;
		registerHandler: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		unregisterHandler: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useFakeTimers();

		mockGetContextIds = vi.fn().mockReturnValue({});
		mockGetRegisteredComponents = vi.fn().mockResolvedValue([]);
		mockEngineCore = {
			getContextIds: mockGetContextIds,
			getRegisteredComponents: mockGetRegisteredComponents
		};
		mockFactory = {
			getIfExists: vi.fn().mockReturnValue(mockEngineCore)
		} as unknown as Factory<unknown>;

		vi.spyOn(Factory, "getFactory").mockReturnValue(mockFactory);
		vi.spyOn(ContextIdStore, "run").mockImplementation(async (contextIds, fn) => fn());

		// Exclude pattern verification is delegated to EngineCloneHelper through the module
		// helper, the default mock echoes the supplied patterns back as verified.
		vi.spyOn(ModuleHelper, "execModuleMethod").mockImplementation(
			async <T>(module: string, method: string, args?: unknown[]): Promise<T> => args?.[0] as T
		);

		mockBackgroundTaskComponent = {
			className: (): string => "MockBackgroundTask",
			registerHandler: vi.fn().mockResolvedValue(undefined),
			create: vi.fn().mockResolvedValue("task-id"),
			unregisterHandler: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(mockBackgroundTaskComponent);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("constructor", () => {
		test("creates an instance with no options", () => {
			expect(new HealthService()).toBeDefined();
		});

		test("creates an instance with custom healthCheckInterval", () => {
			expect(new HealthService({ config: { healthCheckInterval: 60000 } })).toBeDefined();
		});

		test("creates an instance with custom healthCheckApplicationInterval", () => {
			expect(
				new HealthService({ config: { healthCheckApplicationInterval: 300000 } })
			).toBeDefined();
		});
	});

	describe("className", () => {
		test("returns HealthService", () => {
			expect(new HealthService().className()).toBe("HealthService");
		});
	});

	describe("healthStatus", () => {
		test("returns ok with empty components before any interval fires", async () => {
			const service = new HealthService();
			const result = await service.healthStatus();
			expect(result.status).toBe(HealthStatus.Ok);
			expect(result.components).toEqual([]);
		});
	});

	describe("start", () => {
		async function startAndTick(service: HealthService): Promise<void> {
			await service.start();
			await vi.advanceTimersByTimeAsync(30000);
		}

		test("does not collect health when no engine core factory is registered", async () => {
			vi.spyOn(Factory, "getFactory").mockReturnValue(undefined);
			const service = new HealthService();
			await startAndTick(service);
			expect((await service.healthStatus()).components).toEqual([]);
		});

		test("collects health from registered components", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent({ source: "db", status: HealthStatus.Ok })
			]);

			const service = new HealthService();
			await startAndTick(service);

			const { components } = await service.healthStatus();
			expect(components).toHaveLength(1);
			expect(components[0].source).toBe("db");
			expect(components[0].status).toBe(HealthStatus.Ok);
		});

		test("passes a single entry through unchanged without a grouped field", async () => {
			const entry: IHealth = {
				source: "cache",
				status: HealthStatus.Ok,
				description: "Cache health"
			};
			mockGetRegisteredComponents.mockResolvedValue([makeComponent(entry)]);

			const service = new HealthService();
			await startAndTick(service);

			const { components } = await service.healthStatus();
			expect(components[0]).toEqual(entry);
			expect(components[0].grouped).toBeUndefined();
		});

		test("groups entries with the same name under a single parent", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent(
					{ source: "storage", status: HealthStatus.Ok, description: "Primary" },
					{ source: "storage", status: HealthStatus.Ok, description: "Replica" }
				)
			]);

			const service = new HealthService();
			await startAndTick(service);

			const { components } = await service.healthStatus();
			expect(components).toHaveLength(1);
			expect(components[0].source).toBe("storage");
			expect(components[0].grouped).toHaveLength(2);
		});

		test("grouped parent status is error when any child has error", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent(
					{ source: "storage", status: HealthStatus.Ok },
					{ source: "storage", status: HealthStatus.Error }
				)
			]);

			const service = new HealthService();
			await startAndTick(service);

			const { components, status } = await service.healthStatus();
			expect(components[0].status).toBe(HealthStatus.Error);
			expect(status).toBe(HealthStatus.Error);
		});

		test("grouped parent status is warning when any child has warning and none have error", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent(
					{ source: "storage", status: HealthStatus.Ok },
					{ source: "storage", status: HealthStatus.Warning }
				)
			]);

			const service = new HealthService();
			await startAndTick(service);

			const { components, status } = await service.healthStatus();
			expect(components[0].status).toBe(HealthStatus.Warning);
			expect(status).toBe(HealthStatus.Warning);
		});

		test("grouped parent status is ok when all children are ok", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent(
					{ source: "storage", status: HealthStatus.Ok },
					{ source: "storage", status: HealthStatus.Ok }
				)
			]);

			const service = new HealthService();
			await startAndTick(service);

			const { components, status } = await service.healthStatus();
			expect(components[0].status).toBe(HealthStatus.Ok);
			expect(status).toBe(HealthStatus.Ok);
		});

		test("error takes priority over warning in grouped parent status", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent(
					{ source: "storage", status: HealthStatus.Warning },
					{ source: "storage", status: HealthStatus.Error }
				)
			]);

			const service = new HealthService();
			await startAndTick(service);

			const { components } = await service.healthStatus();
			expect(components[0].status).toBe(HealthStatus.Error);
		});

		test("entries with distinct names are not grouped", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent(
					{ source: "db", status: HealthStatus.Ok },
					{ source: "cache", status: HealthStatus.Ok }
				)
			]);

			const service = new HealthService();
			await startAndTick(service);

			const { components } = await service.healthStatus();
			expect(components).toHaveLength(2);
			expect(components.every(c => c.grouped === undefined)).toBe(true);
		});

		test("overall status is error when any top-level component is errored", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent({ source: "db", status: HealthStatus.Error })
			]);

			const service = new HealthService();
			await startAndTick(service);

			expect((await service.healthStatus()).status).toBe(HealthStatus.Error);
		});

		test("overall status is warning when a component has warning and none have error", async () => {
			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent({ source: "db", status: HealthStatus.Warning })
			]);

			const service = new HealthService();
			await startAndTick(service);

			expect((await service.healthStatus()).status).toBe(HealthStatus.Warning);
		});

		describe("application health cycle", () => {
			let capturedCallback:
				((task: IBackgroundTask<undefined, IHealth[]>) => Promise<void>) | undefined;
			let mockRegisterHandler: ReturnType<typeof vi.fn>;
			let mockCreate: ReturnType<typeof vi.fn>;

			beforeEach(() => {
				capturedCallback = undefined;
				mockRegisterHandler = vi
					.fn()
					.mockImplementation(
						async (
							taskType: string,
							module: string,
							method: string,
							callback: (task: IBackgroundTask<undefined, IHealth[]>) => Promise<void>
						) => {
							capturedCallback = callback;
						}
					);
				mockCreate = vi.fn().mockResolvedValue("task-id-1");

				const bgTaskComponent = {
					className: (): string => "MockBackgroundTask",
					registerHandler: mockRegisterHandler,
					create: mockCreate,
					unregisterHandler: vi.fn().mockResolvedValue(undefined)
				};
				vi.spyOn(ComponentFactory, "get").mockReturnValue(bgTaskComponent);
			});

			async function completeTask(
				result: IHealth[],
				status: TaskStatus = TaskStatus.Success
			): Promise<void> {
				await capturedCallback?.({
					id: "urn:task:1",
					type: "health-application-check",
					threadId: "t1",
					dateCreated: "",
					dateModified: "",
					status,
					result: status === TaskStatus.Success ? result : undefined
				});
			}

			test("registers handler on start", async () => {
				const service = new HealthService();
				await service.start();
				expect(mockRegisterHandler).toHaveBeenCalledWith(
					"health-application-check",
					expect.stringContaining("healthApplicationTask.js"),
					"healthApplicationTask",
					expect.any(Function),
					{
						idleShutdownTimeout: -1,
						initialiseMethod: "healthApplicationTaskStart",
						initialiseMethodParams: expect.any(Function),
						shutdownMethod: "healthApplicationTaskEnd"
					}
				);
			});

			test("supplies no exclude patterns to the worker when none are configured", async () => {
				const service = new HealthService();
				await service.start();

				const options = mockRegisterHandler.mock.calls[0][4];
				await expect(options.initialiseMethodParams()).resolves.toEqual([undefined]);
			});

			test("does not load the engine models module when no patterns are configured", async () => {
				const service = new HealthService();
				await service.start();

				expect(ModuleHelper.execModuleMethod).not.toHaveBeenCalled();
			});

			test("verifies the configured exclude patterns on start", async () => {
				const service = new HealthService({
					config: { excludeCloneComponents: ["^rightsManagement", "^messaging"] }
				});
				await service.start();

				expect(ModuleHelper.execModuleMethod).toHaveBeenCalledWith(
					"@3sixty/engine-models",
					"EngineCloneHelper.verifyExcludeCloneComponents",
					[["^rightsManagement", "^messaging"]]
				);
			});

			test("supplies the verified exclude patterns to the worker", async () => {
				vi.mocked(ModuleHelper.execModuleMethod).mockResolvedValue(["^verified"]);

				const service = new HealthService({
					config: { excludeCloneComponents: ["^rightsManagement"] }
				});
				await service.start();

				const options = mockRegisterHandler.mock.calls[0][4];
				await expect(options.initialiseMethodParams()).resolves.toEqual([["^verified"]]);
			});

			test("fails to start when an exclude pattern is not a valid regex", async () => {
				vi.mocked(ModuleHelper.execModuleMethod).mockRejectedValue(
					new GeneralError("EngineCloneHelper", "invalidExcludeCloneComponent", { pattern: "[" })
				);

				const service = new HealthService({ config: { excludeCloneComponents: ["^ok", "["] } });

				await expect(service.start()).rejects.toThrow("invalidExcludeCloneComponent");
				expect(mockRegisterHandler).not.toHaveBeenCalled();
			});

			test("accepts an empty exclude list without error", async () => {
				const service = new HealthService({ config: { excludeCloneComponents: [] } });
				await service.start();

				const options = mockRegisterHandler.mock.calls[0][4];
				await expect(options.initialiseMethodParams()).resolves.toEqual([[]]);
				expect(ModuleHelper.execModuleMethod).not.toHaveBeenCalled();
			});

			test("creates a task when the application health timer fires", async () => {
				const service = new HealthService();
				await startAndTick(service);
				expect(mockCreate).toHaveBeenCalledWith("health-application-check");
			});

			test("merges application health result into overall health on task success", async () => {
				const service = new HealthService();
				await startAndTick(service);
				await completeTask([{ source: "application", status: HealthStatus.Ok }]);
				const { components } = await service.healthStatus();
				expect(components.some(c => c.source === "application")).toBe(true);
			});

			test("does not update application health components on task failure", async () => {
				const service = new HealthService();
				await startAndTick(service);
				await completeTask([], TaskStatus.Failed);
				const { components } = await service.healthStatus();
				expect(components).toEqual([]);
			});

			test("restarts the application timer after task success", async () => {
				const service = new HealthService();
				await startAndTick(service);
				await completeTask([]);
				await vi.advanceTimersByTimeAsync(300000);
				expect(mockCreate).toHaveBeenCalledTimes(2);
			});

			test("restarts the application timer after task failure", async () => {
				const service = new HealthService();
				await startAndTick(service);
				await completeTask([], TaskStatus.Failed);
				await vi.advanceTimersByTimeAsync(300000);
				expect(mockCreate).toHaveBeenCalledTimes(2);
			});

			test("combines results from both the regular and application health timers", async () => {
				mockGetRegisteredComponents.mockResolvedValue([
					{
						component: {
							className: vi.fn().mockReturnValue("MockComponent"),
							health: vi
								.fn()
								.mockResolvedValue([{ source: "connectivity", status: HealthStatus.Ok }])
						}
					}
				]);
				const service = new HealthService();
				await startAndTick(service);
				await completeTask([{ source: "application", status: HealthStatus.Ok }]);
				const { components } = await service.healthStatus();
				const sources = components.map(c => c.source);
				expect(sources).toContain("connectivity");
				expect(sources).toContain("application");
			});
		});
	});

	describe("stop", () => {
		test("clears both timers so health is no longer updated", async () => {
			const service = new HealthService();
			await service.start();
			await service.stop();

			mockGetRegisteredComponents.mockResolvedValue([
				makeComponent({ source: "db", status: HealthStatus.Error })
			]);
			await vi.advanceTimersByTimeAsync(30000);

			expect((await service.healthStatus()).components).toEqual([]);
		});
	});
});
