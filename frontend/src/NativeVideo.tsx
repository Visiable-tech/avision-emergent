// Fallback for module resolvers (e.g. eslint) that don't understand Metro's
// platform-specific file resolution. At runtime Metro picks either
// NativeVideo.web.tsx or NativeVideo.native.tsx before this file is used.
export { default } from './NativeVideo.web';
