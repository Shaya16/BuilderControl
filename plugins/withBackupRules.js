const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

/**
 * Expo config plugin that adds Android backup rules so ADB backup
 * includes AsyncStorage (sharedpref/) and documentDirectory (files/).
 *
 * Produces two XML files:
 *  - backup_rules.xml          → fullBackupContent   (Android ≤ 11)
 *  - data_extraction_rules.xml → dataExtractionRules  (Android 12+)
 */

// Android ≤ 11 — fullBackupContent
// When <include> is used, only the listed domains are backed up (implicit exclude for the rest).
const BACKUP_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <include domain="sharedpref" path="." />
  <include domain="file" path="." />
</full-backup-content>
`;

// Android 12+ — dataExtractionRules
const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <include domain="sharedpref" path="." />
    <include domain="file" path="." />
  </cloud-backup>
  <device-transfer>
    <include domain="sharedpref" path="." />
    <include domain="file" path="." />
  </device-transfer>
</data-extraction-rules>
`;

function withBackupRules(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const mainApp = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // --- Write XML rule files into res/xml/ -----------------------------------
    const resXmlDir = join(
      config.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'res',
      'xml',
    );
    mkdirSync(resXmlDir, { recursive: true });

    writeFileSync(join(resXmlDir, 'backup_rules.xml'), BACKUP_RULES_XML);
    writeFileSync(join(resXmlDir, 'data_extraction_rules.xml'), DATA_EXTRACTION_RULES_XML);

    // --- Set manifest attributes on <application> ----------------------------
    mainApp.$['android:fullBackupContent'] = '@xml/backup_rules';
    mainApp.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';

    return config;
  });
}

module.exports = withBackupRules;
