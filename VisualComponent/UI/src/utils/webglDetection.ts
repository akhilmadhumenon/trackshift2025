/**
 * Detect if WebGL is supported in the current browser
 * @returns true if WebGL is supported, false otherwise
 */
export function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Get WebGL capabilities and version
 * @returns Object with WebGL version and capabilities
 */
export function getWebGLCapabilities(): {
  supported: boolean;
  version: number;
  renderer?: string;
  vendor?: string;
} {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { supported: false, version: 0 };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined;
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined;
    
    const version = gl instanceof WebGL2RenderingContext ? 2 : 1;
    
    return {
      supported: true,
      version,
      renderer,
      vendor
    };
  } catch (e) {
    return { supported: false, version: 0 };
  }
}
