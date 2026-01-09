const fs = require('fs');
const path = require('path');

// Tailwind text color patterns to look for
const TEXT_COLOR_PATTERNS = [
  /text-(gray|blue|green|yellow|orange|red|white|indigo|purple|pink|cyan|teal|emerald|lime|amber|violet|fuchsia|rose|slate|zinc|neutral|stone|black)-\d+/,
  /text-(gray|blue|green|yellow|orange|red|white|indigo|purple|pink|cyan|teal|emerald|lime|amber|violet|fuchsia|rose|slate|zinc|neutral|stone|black)/,
  /dark:text-(gray|blue|green|yellow|orange|red|white|indigo|purple|pink|cyan|teal|emerald|lime|amber|violet|fuchsia|rose|slate|zinc|neutral|stone|black)-\d+/,
  /dark:text-(gray|blue|green|yellow|orange|red|white|indigo|purple|pink|cyan|teal|emerald|lime|amber|violet|fuchsia|rose|slate|zinc|neutral|stone|black)/,
];

interface TagIssue {
  file: string;
  line: number;
  tag: string;
  content: string;
  hasLightMode: boolean;
  hasDarkMode: boolean;
  className?: string;
}

function extractClassName(htmlString: string): string | undefined {
  const classNameMatch = htmlString.match(/className=["']([^"']+)["']/);
  return classNameMatch ? classNameMatch[1] : undefined;
}

function hasTextColorClass(className: string | undefined): { light: boolean; dark: boolean } {
  if (!className) return { light: false, dark: false };

  // Check for light mode text color classes (not prefixed with dark:)
  // Match patterns like "text-gray-900" but not "dark:text-white"
  const lightModePattern = /\btext-(gray|blue|green|yellow|orange|red|white|indigo|purple|pink|cyan|teal|emerald|lime|amber|violet|fuchsia|rose|slate|zinc|neutral|stone|black)(-\d+)?\b/;
  const hasLight = lightModePattern.test(className) && !className.match(/\bdark:text-/);
  
  // Check for dark mode text color classes (prefixed with dark:)
  const darkModePattern = /\bdark:text-(gray|blue|green|yellow|orange|red|white|indigo|purple|pink|cyan|teal|emerald|lime|amber|violet|fuchsia|rose|slate|zinc|neutral|stone|black)(-\d+)?\b/;
  const hasDark = darkModePattern.test(className);

  return { light: hasLight, dark: hasDark };
}

function findTagsInFile(filePath: string): TagIssue[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues: TagIssue[] = [];

  // Match h1-h6, p, span, label, th (table headers), td (table cells), option (select options), and button tags (including JSX with className)
  const tagPattern = /<(h[1-6]|p|span|label|th|td|option|button)(\s+[^>]*)?>/gi;
  
  lines.forEach((line: string, index: number) => {
    let match;
    while ((match = tagPattern.exec(line)) !== null) {
      const tag = match[1].toLowerCase();
      const fullTag = match[0];
      const className = extractClassName(fullTag);
      const { light, dark } = hasTextColorClass(className);
      
      // Skip if it's a self-closing tag
      // Only flag if missing BOTH light and dark mode (will rely on global CSS)
      // OR if it's in a component file and missing at least one mode
      // OR if it's an h1-h6 tag without !important (might be overridden by global CSS)
      const isComponentFile = filePath.includes('/components/') || filePath.includes('/app/');
      const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
      const hasImportant = className && className.includes('!text-');
      
      if (!fullTag.includes('/>') && (!light && !dark)) {
        // Extract a snippet of the content for context
        const lineNumber = index + 1;
        const contentSnippet = line.trim().substring(0, 100);
        
        issues.push({
          file: filePath,
          line: lineNumber,
          tag,
          content: contentSnippet,
          hasLightMode: light,
          hasDarkMode: dark,
          className: className || 'none',
        });
      } else if (isHeading && light && dark && !hasImportant && isComponentFile) {
        // Warn about headings that have colors but might need !important due to global CSS
        const lineNumber = index + 1;
        const contentSnippet = line.trim().substring(0, 100);
        
        issues.push({
          file: filePath,
          line: lineNumber,
          tag,
          content: contentSnippet,
          hasLightMode: light,
          hasDarkMode: dark,
          className: className || 'none',
        });
      }
    }
  });

  return issues;
}

function getAllTsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file: string) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (file !== 'node_modules' && file !== '.next' && file !== 'scripts') {
        getAllTsxFiles(filePath, fileList);
      }
    } else if (
      (file.endsWith('.tsx') || file.endsWith('.ts')) &&
      !file.endsWith('.d.ts')
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function main() {
  console.log('🔍 Scanning for h1-h6 and p tags without proper text color classes...\n');

  // Find all TypeScript/TSX files in src directory
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllTsxFiles(srcDir);

  const allIssues: TagIssue[] = [];
  
  for (const file of files) {
    try {
      const issues = findTagsInFile(file);
      allIssues.push(...issues);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  // Group issues by file
  const issuesByFile = new Map<string, TagIssue[]>();
  allIssues.forEach(issue => {
    if (!issuesByFile.has(issue.file)) {
      issuesByFile.set(issue.file, []);
    }
    issuesByFile.get(issue.file)!.push(issue);
  });

  // Report results
  if (allIssues.length === 0) {
    console.log('✅ All h1-h6 and p tags have proper text color classes!\n');
    return;
  }

  console.log(`⚠️  Found ${allIssues.length} tags that may need text color classes:\n`);

  issuesByFile.forEach((issues, file) => {
    console.log(`\n📄 ${file}`);
    console.log('─'.repeat(80));
    
    issues.forEach(issue => {
      const status = [];
      if (!issue.hasLightMode) status.push('❌ Missing light mode');
      if (!issue.hasDarkMode) status.push('❌ Missing dark mode');
      
      console.log(`  Line ${issue.line}: <${issue.tag}>`);
      console.log(`    Status: ${status.join(', ')}`);
      console.log(`    Classes: ${issue.className}`);
      console.log(`    Content: ${issue.content}`);
      console.log('');
    });
  });

  // Summary
  const missingLight = allIssues.filter(i => !i.hasLightMode).length;
  const missingDark = allIssues.filter(i => !i.hasDarkMode).length;
  const missingBoth = allIssues.filter(i => !i.hasLightMode && !i.hasDarkMode).length;

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary:');
  console.log(`  Total issues: ${allIssues.length}`);
  console.log(`  Missing light mode: ${missingLight}`);
  console.log(`  Missing dark mode: ${missingDark}`);
  console.log(`  Missing both: ${missingBoth}`);
  console.log('='.repeat(80));
}

main();
