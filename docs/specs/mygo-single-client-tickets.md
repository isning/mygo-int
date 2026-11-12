# Single-client composition implementation tickets

Approved fourteen-ticket breakdown for [the single-client composition specification](https://github.com/isning/mygo-int/issues/46). Each ticket targets approximately 20 minutes of active work; compilation and download waiting time are excluded.

Tickets are published with `ready-for-agent` and native blocking relationships. Publishing does not start implementation. The parent specification remains unchanged.

1. [使用 mygo 提供的根启动官方客户端](https://github.com/isning/mygo-int/issues/47)
   Blocked by: None.

2. [在同一 Loader 加载一个原有本地插件](https://github.com/isning/mygo-int/issues/48)
   Blocked by: [使用 mygo 提供的根启动官方客户端](https://github.com/isning/mygo-int/issues/47)

3. [把现有本地管理服务迁入共享运行时](https://github.com/isning/mygo-int/issues/49)
   Blocked by: [在同一 Loader 加载一个原有本地插件](https://github.com/isning/mygo-int/issues/48)

4. [验证远端清单只协调其所有条目](https://github.com/isning/mygo-int/issues/50)
   Blocked by: [在同一 Loader 加载一个原有本地插件](https://github.com/isning/mygo-int/issues/48)

5. [通过原 Slot 覆盖并恢复一个默认 UI 贡献](https://github.com/isning/mygo-int/issues/51)
   Blocked by: [在同一 Loader 加载一个原有本地插件](https://github.com/isning/mygo-int/issues/48)

6. [将实例入口整合进原导航](https://github.com/isning/mygo-int/issues/52)
   Blocked by: [把现有本地管理服务迁入共享运行时](https://github.com/isning/mygo-int/issues/49), [通过原 Slot 覆盖并恢复一个默认 UI 贡献](https://github.com/isning/mygo-int/issues/51)

7. [将本地设置并入原 Settings](https://github.com/isning/mygo-int/issues/53)
   Blocked by: [把现有本地管理服务迁入共享运行时](https://github.com/isning/mygo-int/issues/49), [通过原 Slot 覆盖并恢复一个默认 UI 贡献](https://github.com/isning/mygo-int/issues/51)

8. [在原插件页面汇总三种来源](https://github.com/isning/mygo-int/issues/54)（后续产品决策收敛为原远端卡片显示 Remote/Client 状态，并使用独立 Local tab）
   Blocked by: [把现有本地管理服务迁入共享运行时](https://github.com/isning/mygo-int/issues/49), [通过原 Slot 覆盖并恢复一个默认 UI 贡献](https://github.com/isning/mygo-int/issues/51)

9. [从统一管理页面启停和配置本地插件](https://github.com/isning/mygo-int/issues/55)
   Blocked by: [在原插件页面汇总三种来源](https://github.com/isning/mygo-int/issues/54)

10. [从统一管理页面明确执行 Host 管理动作](https://github.com/isning/mygo-int/issues/56)
   Blocked by: [在原插件页面汇总三种来源](https://github.com/isning/mygo-int/issues/54)

11. [为实例 client 条目提供正确的管理能力](https://github.com/isning/mygo-int/issues/57)
   Blocked by: [验证远端清单只协调其所有条目](https://github.com/isning/mygo-int/issues/50), [在原插件页面汇总三种来源](https://github.com/isning/mygo-int/issues/54)

12. [恢复旧设备配置并验证失败恢复](https://github.com/isning/mygo-int/issues/58)
   Blocked by: [从统一管理页面启停和配置本地插件](https://github.com/isning/mygo-int/issues/55)

13. [在统一客户端显示组合冲突与依赖错误](https://github.com/isning/mygo-int/issues/59)
   Blocked by: [验证远端清单只协调其所有条目](https://github.com/isning/mygo-int/issues/50), [在原插件页面汇总三种来源](https://github.com/isning/mygo-int/issues/54)

14. [将默认客户端切换为单根统一组合](https://github.com/isning/mygo-int/issues/60)
   Blocked by: [将实例入口整合进原导航](https://github.com/isning/mygo-int/issues/52), [将本地设置并入原 Settings](https://github.com/isning/mygo-int/issues/53), [从统一管理页面启停和配置本地插件](https://github.com/isning/mygo-int/issues/55), [从统一管理页面明确执行 Host 管理动作](https://github.com/isning/mygo-int/issues/56), [为实例 client 条目提供正确的管理能力](https://github.com/isning/mygo-int/issues/57), [恢复旧设备配置并验证失败恢复](https://github.com/isning/mygo-int/issues/58), [在统一客户端显示组合冲突与依赖错误](https://github.com/isning/mygo-int/issues/59)

The first ticket is the initial frontier. Work expands through shared loading, local management, original Slot overrides and owner-scoped reconciliation; the last ticket switches the default composition after its actual prerequisites complete.

Verification uses the agreed complete browser client with a real pinned Host and a clearly labeled local model mock. Local management must not implicitly mutate Host plugins or configuration.
