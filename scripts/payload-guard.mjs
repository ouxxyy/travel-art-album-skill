// 分享包边界守卫：识别载荷中的本机绝对路径形态。
// 覆盖清单要求的所有形态：POSIX 常见绝对路径（含 macOS /private 前缀）、$HOME、~ 开头。
const ABSOLUTE_PATH_PATTERNS = [
  [/(?:private\/)?(?:Users|var|tmp|Volumes|opt|etc)\//, "POSIX 绝对路径"],
  [/\$HOME/, "$HOME 引用"],
  [/~\//, "~ 开头路径"],
];

// 命中则返回可读描述（含命中的文本片段），未命中返回 null。
export function findAbsolutePath(text) {
  for (const [pattern, label] of ABSOLUTE_PATH_PATTERNS) {
    const hit = text.match(pattern);
    if (hit) return `${label}：${JSON.stringify(hit[0])}`;
  }
  return null;
}
