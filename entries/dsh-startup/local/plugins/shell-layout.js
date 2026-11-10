// Trusted local presentation only. The original instance Root keeps all DSH services.
export function mountShell(ctx, { name, label, rail }) {
  ctx.effect(() => {
    const root = document.getElementById('root')
    if (!root || document.querySelector('[data-mygo-shell]')) {
      throw new Error('Local shell requires one unclaimed original instance outlet')
    }
    const parent = root.parentNode
    const next = root.nextSibling
    const shell = document.createElement('div')
    shell.dataset.mygoShell = name
    shell.dataset.mygoLocalPlugin = name
    shell.dataset.contributionOwner = 'trusted-local'
    const chrome = document.createElement(rail ? 'aside' : 'header')
    chrome.className = 'mygo-shell-chrome'
    const title = document.createElement('strong')
    title.textContent = label
    const ownership = document.createElement('span')
    ownership.textContent = 'Trusted local shell'
    const destination = document.createElement('span')
    destination.textContent = 'Connected instance · original DSH UI'
    chrome.append(title, ownership, destination)
    const outlet = document.createElement('main')
    outlet.className = 'mygo-instance-outlet'
    outlet.dataset.uiOwner = 'connected-instance'
    outlet.setAttribute('aria-label', 'Connected instance: original DSH UI')
    const style = document.createElement('style')
    style.textContent = `
      [data-mygo-shell="${name}"] { display:grid; ${rail ? 'grid-template-columns:200px minmax(0,1fr)' : 'grid-template-rows:56px minmax(0,1fr)'}; width:100%;height:100%;min-height:0;overflow:hidden; }
      [data-mygo-shell="${name}"] .mygo-shell-chrome { display:flex; ${rail ? 'flex-direction:column;gap:24px;padding:28px 18px;background:#173b32' : 'align-items:center;gap:24px;padding:0 24px;background:#573b71'}; color:white;font:13px system-ui; }
      [data-mygo-shell="${name}"] .mygo-shell-chrome strong { font-size:18px; }
      [data-mygo-shell="${name}"] .mygo-instance-outlet { min-width:0;min-height:0;overflow:hidden;position:relative; }
      [data-mygo-shell="${name}"] #root { width:100%;height:100%;min-width:0;min-height:0; }
      @media(max-width:640px) { [data-mygo-shell="${name}"] { ${rail ? 'grid-template-columns:128px minmax(0,1fr)' : 'grid-template-rows:88px minmax(0,1fr)'}; } [data-mygo-shell="${name}"] .mygo-shell-chrome { gap:10px;padding:12px;flex-wrap:wrap; } }
    `
    shell.append(style, chrome, outlet)
    parent.insertBefore(shell, root)
    outlet.append(root)
    return () => {
      // Move the same node back; never unmount/remount the original React root.
      parent.insertBefore(root, next?.parentNode === parent ? next : null)
      shell.remove()
    }
  })
}
