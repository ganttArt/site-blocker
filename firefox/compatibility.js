// Cross-browser compatibility layer
// Makes the extension work on both Chrome and Firefox

// Firefox uses 'browser' namespace, Chrome uses 'chrome' namespace
// This ensures 'browser' is available in both
if (typeof browser === 'undefined') {
    // Chrome - make 'browser' an alias for 'chrome'
    window.browser = chrome;
}
