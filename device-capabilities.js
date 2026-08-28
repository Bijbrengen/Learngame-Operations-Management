(() => {
  "use strict";

  const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk/i;
  const NON_COMPUTER_USER_AGENT = /Xbox|PlayStation|Nintendo|SmartTV|SMART-TV|Tizen|Web0S|HbbTV|NetCast|Viera|BRAVIA|CrKey|AFT[A-Z0-9]*/i;

  function classify(input = {}) {
    const userAgent = String(input.userAgent || "");
    const platform = String(input.platform || "");
    const maxTouchPoints = Math.max(0, Number(input.maxTouchPoints || 0));
    const mobileClientHint = input.userAgentDataMobile === true;
    const mobileUserAgent = MOBILE_USER_AGENT.test(userAgent);
    const nonComputerUserAgent = NON_COMPUTER_USER_AGENT.test(userAgent);
    const ipadDesktopMode = /Mac/i.test(platform)
      && maxTouchPoints > 1
      && /Macintosh|Mac OS X/i.test(userAgent);
    const touchOnlyDevice = maxTouchPoints > 0
      && input.primaryPointerCoarse === true
      && input.anyFinePointer !== true
      && input.anyHover !== true;
    const isMobileDevice = mobileClientHint
      || mobileUserAgent
      || nonComputerUserAgent
      || ipadDesktopMode
      || touchOnlyDevice;

    return Object.freeze({
      deviceKind: isMobileDevice ? "mobile" : "computer",
      isMobileDevice,
      supportsDigitalPlay: !isMobileDevice,
      supportsTutorial: !isMobileDevice,
      supportsGameManagement: !isMobileDevice,
      supportsSessionCreation: !isMobileDevice
    });
  }

  function mediaMatches(query) {
    try {
      return typeof window === "object"
        && typeof window.matchMedia === "function"
        && window.matchMedia(query).matches;
    } catch {
      return false;
    }
  }

  function current() {
    const browserNavigator = typeof navigator === "object" ? navigator : {};
    return classify({
      userAgent: browserNavigator.userAgent,
      userAgentDataMobile: browserNavigator.userAgentData?.mobile,
      platform: browserNavigator.platform,
      maxTouchPoints: browserNavigator.maxTouchPoints,
      primaryPointerCoarse: mediaMatches("(pointer: coarse)"),
      anyFinePointer: mediaMatches("(any-pointer: fine)"),
      anyHover: mediaMatches("(any-hover: hover)")
    });
  }

  function supportsSession(playMode, capabilities = current()) {
    if (capabilities.supportsDigitalPlay !== false) return true;
    return playMode === "physical";
  }

  const api = Object.freeze({ classify, current, supportsSession });
  if (typeof window === "object") window.LOMDeviceCapabilities = api;
  if (typeof document === "object" && document.documentElement) {
    document.documentElement.dataset.deviceKind = current().deviceKind;
  }
  if (typeof module === "object" && module.exports) module.exports = api;
})();
