export function renderNavMenu(tableView) {
  const container = tableView.navigationContainer;
  if (!container) return;
  container.innerHTML = '';
  (tableView.manager.navMenu || []).forEach(menuItem => {
    const navItemElement = document.createElement('div');
    navItemElement.className = 'clickable';
    if (menuItem.onClick) {
      navItemElement.onclick = () => {
        const handlerFunction = tableView.manager.actionHandlerMap[menuItem.onClick];
        if (handlerFunction && typeof handlerFunction === 'function') {
          handlerFunction();
        }
      };
    } else if (menuItem.tableKey) {
      navItemElement.onclick = () => tableView.onTableSelected(menuItem.tableKey);
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