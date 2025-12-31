/**
 * Configuration Diff Service
 * Compares two backup configurations and generates a diff report
 */

const logger = require('../logger');

class DiffService {
  /**
   * Compare two configurations and generate a detailed diff
   */
  static compareConfigurations(config1, config2, label1 = 'Backup 1', label2 = 'Backup 2') {
    try {
      const lines1 = config1.split('\n');
      const lines2 = config2.split('\n');

      const diff = this.generateDiff(lines1, lines2);

      return {
        success: true,
        summary: {
          label1,
          label2,
          totalLines1: lines1.length,
          totalLines2: lines2.length,
          addedLines: diff.added.length,
          removedLines: diff.removed.length,
          modifiedLines: diff.modified.length,
          unchangedLines: diff.unchanged.length
        },
        changes: {
          added: diff.added,
          removed: diff.removed,
          modified: diff.modified
        },
        diffReport: this.generateDiffReport(diff, label1, label2)
      };
    } catch (error) {
      logger.error('Failed to compare configurations', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate diff between two line arrays
   */
  static generateDiff(lines1, lines2) {
    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];

    const set1 = new Set(lines1.map(l => l.trim()).filter(l => l));
    const set2 = new Set(lines2.map(l => l.trim()).filter(l => l));

    // Find added lines (in config2 but not in config1)
    lines2.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed && !set1.has(trimmed)) {
        added.push({ line: trimmed, index: idx });
      }
    });

    // Find removed lines (in config1 but not in config2)
    lines1.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed && !set2.has(trimmed)) {
        removed.push({ line: trimmed, index: idx });
      }
    });

    // Find unchanged lines
    lines1.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && set2.has(trimmed)) {
        unchanged.push({ line: trimmed });
      }
    });

    return { added, removed, modified, unchanged };
  }

  /**
   * Generate detailed diff report
   */
  static generateDiffReport(diff, label1, label2) {
    let report = `################################################################################\n`;
    report += `# CONFIGURATION DIFF REPORT\n`;
    report += `################################################################################\n`;
    report += `# Comparing: ${label1} vs ${label2}\n`;
    report += `# Generated: ${new Date().toISOString()}\n`;
    report += `################################################################################\n\n`;

    report += `## SUMMARY\n`;
    report += `Removed lines: ${diff.removed.length}\n`;
    report += `Added lines: ${diff.added.length}\n`;
    report += `Unchanged lines: ${diff.unchanged.length}\n\n`;

    if (diff.removed.length > 0) {
      report += `## REMOVED (Lines that were in ${label1} but are not in ${label2})\n`;
      report += `${'='.repeat(80)}\n`;
      diff.removed.forEach((item) => {
        report += `- ${item.line}\n`;
      });
      report += `\n`;
    }

    if (diff.added.length > 0) {
      report += `## ADDED (Lines that are in ${label2} but were not in ${label1})\n`;
      report += `${'='.repeat(80)}\n`;
      diff.added.forEach((item) => {
        report += `+ ${item.line}\n`;
      });
      report += `\n`;
    }

    report += `################################################################################\n`;
    report += `# END OF DIFF REPORT\n`;
    report += `################################################################################\n`;

    return report;
  }

  /**
   * Get summary of changes by category
   */
  static categorizeChanges(diff) {
    const categories = {
      vlan: { added: [], removed: [] },
      snmp: { added: [], removed: [] },
      interface: { added: [], removed: [] },
      routing: { added: [], removed: [] },
      hostname: { added: [], removed: [] },
      password: { added: [], removed: [] },
      other: { added: [], removed: [] }
    };

    const categorize = (line) => {
      if (line.toLowerCase().includes('vlan')) return 'vlan';
      if (line.toLowerCase().includes('snmp')) return 'snmp';
      if (line.toLowerCase().includes('interface') || line.toLowerCase().includes('eth')) return 'interface';
      if (line.toLowerCase().includes('route') || line.toLowerCase().includes('gateway')) return 'routing';
      if (line.toLowerCase().includes('hostname')) return 'hostname';
      if (line.toLowerCase().includes('password')) return 'password';
      return 'other';
    };

    diff.added.forEach(item => {
      const category = categorize(item.line);
      categories[category].added.push(item.line);
    });

    diff.removed.forEach(item => {
      const category = categorize(item.line);
      categories[category].removed.push(item.line);
    });

    return categories;
  }
}

module.exports = DiffService;
