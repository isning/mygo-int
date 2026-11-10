# mygo implementation tickets

Approved twenty-minute active-work tickets published from the [project specification](https://github.com/isning/mygo-int/issues/25). Compilation/download waiting time is excluded. The source issue was not modified or closed.

1. [固定可复现的 DSH 源码与构建入口](https://github.com/isning/mygo-int/issues/26)
   Blocked by: None.

2. [取得原始 Web 入口的可用构建制品](https://github.com/isning/mygo-int/issues/27)
   Blocked by: [固定可复现的 DSH 源码与构建入口](https://github.com/isning/mygo-int/issues/26)

3. [让独立页面显示官方启动状态](https://github.com/isning/mygo-int/issues/28)
   Blocked by: [取得原始 Web 入口的可用构建制品](https://github.com/isning/mygo-int/issues/27)

4. [让薄远端适配插件返回受认证的状态](https://github.com/isning/mygo-int/issues/29)
   Blocked by: [固定可复现的 DSH 源码与构建入口](https://github.com/isning/mygo-int/issues/26)

5. [通过薄适配取得完整有序启动注入](https://github.com/isning/mygo-int/issues/30)
   Blocked by: [让薄远端适配插件返回受认证的状态](https://github.com/isning/mygo-int/issues/29)

6. [在独立入口应用远端启动注入](https://github.com/isning/mygo-int/issues/31)
   Blocked by: [让独立页面显示官方启动状态](https://github.com/isning/mygo-int/issues/28), [通过薄适配取得完整有序启动注入](https://github.com/isning/mygo-int/issues/30)

7. [从目标 Host 加载首批真实 client bundle](https://github.com/isning/mygo-int/issues/32)
   Blocked by: [在独立入口应用远端启动注入](https://github.com/isning/mygo-int/issues/31)

8. [让原 RPC 访问目标实例的一个只读方法](https://github.com/isning/mygo-int/issues/33)
   Blocked by: [在独立入口应用远端启动注入](https://github.com/isning/mygo-int/issues/31)

9. [让原实时连接收到目标 Host 事件](https://github.com/isning/mygo-int/issues/34)
   Blocked by: [让原 RPC 访问目标实例的一个只读方法](https://github.com/isning/mygo-int/issues/33)

10. [在独立客户端打开真实会话列表](https://github.com/isning/mygo-int/issues/35)
   Blocked by: [从目标 Host 加载首批真实 client bundle](https://github.com/isning/mygo-int/issues/32), [让原实时连接收到目标 Host 事件](https://github.com/isning/mygo-int/issues/34)

11. [走通一条会话消息的发送与回复](https://github.com/isning/mygo-int/issues/36)
   Blocked by: [在独立客户端打开真实会话列表](https://github.com/isning/mygo-int/issues/35)

12. [修正一个真实样式或图片资源的地址](https://github.com/isning/mygo-int/issues/37)
   Blocked by: [在独立客户端打开真实会话列表](https://github.com/isning/mygo-int/issues/35)

13. [加载一个旧插件的懒加载界面](https://github.com/isning/mygo-int/issues/38)
   Blocked by: [走通一条会话消息的发送与回复](https://github.com/isning/mygo-int/issues/36)

14. [从旧插件界面完成一个实际服务动作](https://github.com/isning/mygo-int/issues/39)
   Blocked by: [加载一个旧插件的懒加载界面](https://github.com/isning/mygo-int/issues/38)

15. [在线上传一个会话附件](https://github.com/isning/mygo-int/issues/40)
   Blocked by: [走通一条会话消息的发送与回复](https://github.com/isning/mygo-int/issues/36)

16. [从会话下载一个实际文件](https://github.com/isning/mygo-int/issues/41)
   Blocked by: [走通一条会话消息的发送与回复](https://github.com/isning/mygo-int/issues/36)

17. [由本地启动配置选择一个可信入口](https://github.com/isning/mygo-int/issues/42)
   Blocked by: [走通一条会话消息的发送与回复](https://github.com/isning/mygo-int/issues/36)

18. [切换一个本地外壳贡献](https://github.com/isning/mygo-int/issues/43)
   Blocked by: [由本地启动配置选择一个可信入口](https://github.com/isning/mygo-int/issues/42)

19. [登记远端 client 条目的所有者](https://github.com/isning/mygo-int/issues/44)
   Blocked by: [切换一个本地外壳贡献](https://github.com/isning/mygo-int/issues/43)

20. [移除远端贡献时保留本地外壳](https://github.com/isning/mygo-int/issues/45)
   Blocked by: [登记远端 client 条目的所有者](https://github.com/isning/mygo-int/issues/44), [从旧插件界面完成一个实际服务动作](https://github.com/isning/mygo-int/issues/39)

These tickets cover independent React boot, existing-plugin interaction and minimal local/remote composition. Remaining approved work groups are retained for decomposition once their inputs are concrete; this is not a product-release scope split.

Publishing tickets does not start implementation or authorize remote installation, deployment or git pushes.
