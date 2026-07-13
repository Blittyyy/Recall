import UIKit
import UniformTypeIdentifiers
import os.log
import ObjectiveC

class ShareViewController: UIViewController {
  private let recallScheme = "recall"
  private let urlLock = NSLock()
  private var collectedURLs: [String] = []
  private let logger = Logger(
    subsystem: "com.blitty.recall.RecallShare",
    category: "ShareViewController"
  )

  override func viewDidLoad() {
    super.viewDidLoad()
    view.isHidden = true
    processSharedItems()
  }

  private func log(_ message: String) {
    logger.info("\(message, privacy: .public)")
    print("[RecallShare] \(message)")
  }

  private func processSharedItems() {
    guard let extensionContext else {
      log("FAILURE: extensionContext is nil")
      complete()
      return
    }

    let extensionItems = extensionContext.inputItems
    log("extensionContext.inputItems count=\(extensionItems.count)")

    guard let items = extensionItems as? [NSExtensionItem], !items.isEmpty else {
      log("FAILURE: no NSExtensionItem input items")
      complete()
      return
    }

    let providers = items.flatMap { $0.attachments ?? [] }
    log("attachment provider count=\(providers.count)")

    for (index, provider) in providers.enumerated() {
      let typeIds = provider.registeredTypeIdentifiers.joined(separator: ", ")
      log("provider[\(index)] registeredTypeIdentifiers=[\(typeIds)]")
    }

    guard !providers.isEmpty else {
      log("FAILURE: no attachments on input items")
      complete()
      return
    }

    collectURLs(from: providers) { [weak self] sharedURL in
      guard let self = self else { return }

      let collected = self.getCollectedURLs()
      log("collected URL count=\(collected.count)")
      collected.forEach { self.log("collected URL: \($0)") }

      guard let sharedURL else {
        self.log("FAILURE: no URL extracted from shared items")
        self.complete()
        return
      }

      self.log("selected URL: \(sharedURL)")

      guard let deepLink = self.makeRecallDeepLink(for: sharedURL) else {
        self.log("FAILURE: could not build recall:// deep link for URL: \(sharedURL)")
        self.complete()
        return
      }

      self.log("deep link: \(deepLink.absoluteString)")

      self.openRecall(deepLink) { success in
        if success {
          self.log("SUCCESS: open Recall request dispatched")
        } else {
          self.log("FAILURE: could not open Recall — app may not have registered recall://")
        }
        self.complete()
      }
    }
  }

  private func collectURLs(
    from providers: [NSItemProvider],
    index: Int = 0,
    completion: @escaping (String?) -> Void
  ) {
    if index >= providers.count {
      completion(Self.selectBestURL(from: getCollectedURLs()))
      return
    }

    let provider = providers[index]

    if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
      log("provider[\(index)] loading \(UTType.url.identifier)")
      provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] item, error in
        guard let self = self else { return }

        if let error {
          self.log("provider[\(index)] loadItem error: \(error.localizedDescription)")
        }

        if let url = item as? URL {
          self.log("provider[\(index)] loaded URL object: \(url.absoluteString)")
          self.storeURL(url.absoluteString)
        } else if let urlString = item as? String {
          self.log("provider[\(index)] loaded URL string: \(urlString)")
          self.storeURL(urlString)
        } else if let data = item as? Data, let urlString = String(data: data, encoding: .utf8) {
          self.log("provider[\(index)] loaded URL data: \(urlString)")
          self.storeURL(urlString)
        } else {
          self.log("provider[\(index)] loadItem returned unexpected type: \(String(describing: item))")
        }

        self.collectURLs(from: providers, index: index + 1, completion: completion)
      }
      return
    }

    if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
      log("provider[\(index)] loading \(UTType.plainText.identifier)")
      provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] item, error in
        guard let self = self else { return }

        if let error {
          self.log("provider[\(index)] loadItem error: \(error.localizedDescription)")
        }

        if let text = item as? String {
          let urls = Self.allURLs(in: text)
          self.log("provider[\(index)] plain text URLs found=\(urls.count)")
          urls.forEach { self.storeURL($0) }
          Self.instagramURLs(in: text).forEach { self.storeURL($0) }
        }

        self.collectURLs(from: providers, index: index + 1, completion: completion)
      }
      return
    }

    if provider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
      log("provider[\(index)] loading \(UTType.text.identifier)")
      provider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { [weak self] item, error in
        guard let self = self else { return }

        if let error {
          self.log("provider[\(index)] loadItem error: \(error.localizedDescription)")
        }

        if let text = item as? String {
          let urls = Self.allURLs(in: text)
          self.log("provider[\(index)] text URLs found=\(urls.count)")
          urls.forEach { self.storeURL($0) }
          Self.instagramURLs(in: text).forEach { self.storeURL($0) }
        }

        self.collectURLs(from: providers, index: index + 1, completion: completion)
      }
      return
    }

    log("provider[\(index)] skipped — no supported type identifier")
    collectURLs(from: providers, index: index + 1, completion: completion)
  }

  private func storeURL(_ value: String) {
    guard let normalized = Self.normalizeIncomingURL(value) else {
      log("skipped non-shareable URL: \(value)")
      return
    }

    urlLock.lock()
    if !collectedURLs.contains(normalized) {
      collectedURLs.append(normalized)
    }
    urlLock.unlock()
  }

  private func getCollectedURLs() -> [String] {
    urlLock.lock()
    defer { urlLock.unlock() }
    return collectedURLs
  }

  private static func normalizeURLString(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, parseURL(trimmed) != nil else {
      return nil
    }
    return trimmed
  }

  private static func normalizeIncomingURL(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }

    if trimmed.lowercased().hasPrefix("instagram://"),
       let converted = convertInstagramSchemeToHttps(trimmed) {
      return converted
    }

    guard let parsed = parseURL(trimmed), let scheme = parsed.scheme?.lowercased() else {
      return nil
    }

    if scheme == "http" || scheme == "https" {
      return trimmed
    }

    return nil
  }

  private static func convertInstagramSchemeToHttps(_ value: String) -> String? {
    guard let url = URL(string: value),
          url.scheme?.lowercased() == "instagram" else {
      return nil
    }

    if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
       let shortcode = components.queryItems?.first(where: { $0.name == "shortcode" })?.value,
       !shortcode.isEmpty {
      return "https://www.instagram.com/reel/\(shortcode)/"
    }

    let host = (url.host ?? "").lowercased()
    let pathParts = url.path.split(separator: "/").map(String.init)

    if host == "reel" || host == "p" || host == "reels" {
      let code = pathParts.first ?? host
      if !code.isEmpty, code != host {
        let kind = host == "reels" ? "reel" : host
        return "https://www.instagram.com/\(kind)/\(code)/"
      }
    }

    if host.contains("instagram.com") {
      var https = URLComponents()
      https.scheme = "https"
      https.host = host.hasPrefix("www.") ? host : "www.\(host)"
      https.path = url.path.isEmpty ? "/" : url.path
      return https.url?.absoluteString
    }

    if let first = pathParts.first, ["reel", "reels", "p"].contains(first),
       let code = pathParts.dropFirst().first {
      let kind = first == "reels" ? "reel" : first
      return "https://www.instagram.com/\(kind)/\(code)/"
    }

    return nil
  }

  private static func instagramURLs(in text: String) -> [String] {
    let pattern = #"(?:https?://)?(?:www\.)?instagram\.com/(?:reels?|p)/[A-Za-z0-9_-]+"#
    guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
      return []
    }

    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    return regex.matches(in: text, options: [], range: range).compactMap { match in
      guard let matchRange = Range(match.range, in: text) else { return nil }
      let raw = String(text[matchRange])
      return normalizeIncomingURL(raw.hasPrefix("http") ? raw : "https://\(raw)")
    }
  }

  private static func allURLs(in text: String) -> [String] {
    guard let detector = try? NSDataDetector(
      types: NSTextCheckingResult.CheckingType.link.rawValue
    ) else {
      return []
    }

    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    return detector
      .matches(in: text, options: [], range: range)
      .compactMap { $0.url?.absoluteString }
  }

  /// Picks the best URL from everything the share sheet provided.
  /// Priority: supported video platforms (YouTube → TikTok → Instagram), then any HTTP(S) link.
  private static func selectBestURL(from urls: [String]) -> String? {
    let httpURLs = urls.filter { isValidHttpURL($0) }

    for platform in SupportedPlatform.selectionPriority {
      if let match = httpURLs.first(where: { detectPlatform($0) == platform }) {
        return match
      }
    }

    return httpURLs.first
  }

  private static func isValidHttpURL(_ value: String) -> Bool {
    guard let url = parseURL(value), let scheme = url.scheme?.lowercased() else {
      return false
    }
    return scheme == "http" || scheme == "https"
  }

  private static func parseURL(_ input: String) -> URL? {
    let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }

    if let url = URL(string: trimmed), url.scheme != nil {
      return url
    }

    return URL(string: "https://\(trimmed)")
  }

  private static func detectPlatform(_ input: String) -> SupportedPlatform? {
    guard let url = parseURL(input), let host = normalizedHost(url) else {
      return nil
    }

    if isHostOrSubdomain(host, "tiktok.com")
      || isHostOrSubdomain(host, "vm.tiktok.com")
      || isHostOrSubdomain(host, "vt.tiktok.com") {
      return .tiktok
    }

    if isHostOrSubdomain(host, "instagram.com") || isHostOrSubdomain(host, "instagr.am") {
      let path = url.path.lowercased()
      if path.hasPrefix("/reel/") || path.hasPrefix("/reels/") || path.hasPrefix("/p/") {
        return .instagram
      }
      return nil
    }

    if isHostOrSubdomain(host, "youtube.com") || isHostOrSubdomain(host, "youtu.be") {
      return .youtube
    }

    return nil
  }

  private static func normalizedHost(_ url: URL) -> String? {
    guard var host = url.host?.lowercased() else { return nil }
    if host.hasPrefix("www.") {
      host = String(host.dropFirst(4))
    }
    return host
  }

  private static func isHostOrSubdomain(_ hostname: String, _ domain: String) -> Bool {
    hostname == domain || hostname.hasSuffix(".\(domain)")
  }

  private func makeRecallDeepLink(for sharedURL: String) -> URL? {
    var components = URLComponents()
    components.scheme = recallScheme
    components.host = "save"
    components.queryItems = [URLQueryItem(name: "url", value: sharedURL)]
    return components.url
  }

  private func openRecall(_ url: URL, completion: @escaping (Bool) -> Void) {
    DispatchQueue.main.async {
      if self.openViaUIApplicationResponderChain(url) {
        self.log("Dispatched UIApplication open via responder chain")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
          completion(true)
        }
        return
      }

      guard let context = self.extensionContext else {
        self.log("FAILURE: extensionContext is nil when attempting open")
        completion(false)
        return
      }

      if context.responds(to: #selector(NSExtensionContext.open(_:completionHandler:))) {
        self.log("Trying extensionContext.open (share extensions usually return false here)")
        context.open(url) { success in
          self.log("extensionContext.open completion success=\(success)")
          DispatchQueue.main.async {
            completion(success)
          }
        }
        return
      }

      self.log("FAILURE: extensionContext.open is unavailable on this OS version")
      completion(false)
    }
  }

  /// Share extensions cannot call UIApplication.shared, but walking the responder chain
  /// to UIApplication and calling openURL:options:completionHandler: is the reliable handoff.
  /// extensionContext.open does not work for com.apple.share-services extensions.
  @discardableResult
  private func openViaUIApplicationResponderChain(_ url: URL) -> Bool {
    let modernSelector = NSSelectorFromString("openURL:options:completionHandler:")
    let legacySelector = NSSelectorFromString("openURL:")
    var responder: UIResponder? = self

    while let current = responder {
      let className = NSStringFromClass(type(of: current))

      if className == "UIApplication" {
        if current.responds(to: modernSelector) {
          log("Found UIApplication — calling openURL:options:completionHandler:")
          return openURLViaRuntime(
            on: current,
            selector: modernSelector,
            url: url
          )
        }

        if current.responds(to: legacySelector) {
          log("Found UIApplication — calling legacy openURL:")
          _ = current.perform(legacySelector, with: url)
          return true
        }

        log("Found UIApplication but it does not respond to openURL selectors")
        return false
      }

      responder = current.next
    }

    log("UIApplication not found in responder chain")
    return false
  }

  private func openURLViaRuntime(
    on application: UIResponder,
    selector: Selector,
    url: URL
  ) -> Bool {
    typealias OpenURLIMP = @convention(c) (
      AnyObject,
      Selector,
      URL,
      NSDictionary,
      (@convention(block) (Bool) -> Void)?
    ) -> Void

    guard let method = class_getInstanceMethod(object_getClass(application), selector) else {
      log("Could not resolve openURL:options:completionHandler: implementation")
      return false
    }

    let implementation = method_getImplementation(method)
    let openURL = unsafeBitCast(implementation, to: OpenURLIMP.self)
    openURL(application, selector, url, NSDictionary(), nil)
    return true
  }

  private func complete() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}

private enum SupportedPlatform {
  case youtube
  case tiktok
  case instagram

  static let selectionPriority: [SupportedPlatform] = [.youtube, .tiktok, .instagram]
}
