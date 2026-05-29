const [major, minor] = process.versions.node.split('.').map(Number)
const minMajor = 18
const minMinor = 4

if (major < minMajor || (major === minMajor && minor < minMinor)) {
  console.error(
    `\n❌ Node.js 版本过低：当前 ${process.versions.node}，本项目需要 >= ${minMajor}.${minMinor}.0\n` +
      `   Vite 6 依赖较新的 Node 内置模块，请升级后重试，例如：\n` +
      `   nvm install 20 && nvm use 20\n` +
      `   或从 https://nodejs.org 安装 LTS 版本\n`,
  )
  process.exit(1)
}
