export function renderNavMenu() {
  const container = this.navigationContainer;
  if (!container) return;
  container.innerHTML = '';
  (this.manager.navMenu || []).forEach(menuItem => {
    const navItemElement = document.createElement('div');
    navItemElement.className = 'clickable';
    if (menuItem.onClick) {
      navItemElement.onclick = () => {
        const handlerFunction = this.manager.actionHandlerMap[menuItem.onClick];
        if (handlerFunction && typeof handlerFunction === 'function') {
          handlerFunction();
        }
      };
    } else if (menuItem.tableKey) {
      navItemElement.onclick = () => this.onTableSelected(menuItem.tableKey);
    }
    if (menuItem.icon) {
      const imageElement = document.createElement('img');
      imageElement.className = 'nav-icon';
      imageElement.src = menuItem.icon;
      imageElement.alt = menuItem.label + ' icon';
      navItemElement.appendChild(imageElement);
    }
    const textNodeElement = document.createTextNode(' ' + (menuItem.label || menuItem.tableKey));
    navItemElement.appendChild(textNodeElement);
    container.appendChild(navItemElement);
  });
}