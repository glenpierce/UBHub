export class RendererRegistry {
  constructor() { this.registryMap = new Map(); }
  register(name, rendererFunction) { this.registryMap.set(name, rendererFunction); }
  get(name) { return this.registryMap.get(name); }
}
