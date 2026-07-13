/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "share",
  name: "RecallShare",
  displayName: "Recall",
  icon: "../../assets/images/icon.png",
  bundleIdentifier: ".RecallShare",
  deploymentTarget: "15.1",
  frameworks: ["UniformTypeIdentifiers"],
});
