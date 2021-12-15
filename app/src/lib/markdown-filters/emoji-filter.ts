export class EmojiFilter {
  private readonly emojiRegex: RegExp
  private readonly emoji: Map<string, string>

  public constructor(emoji: Map<string, string>) {
    this.emoji = emoji
    const emojiMatches = [...this.emoji.keys()]
      .map(emoji => escapeRegExp(emoji))
      .join('|')
      .slice(0, -1)
    this.emojiRegex = new RegExp('(' + emojiMatches + ')', 'g')
  }

  public async filter(node: Node) {
    if (
      node.parentElement === null ||
      node.textContent === null ||
      !node.textContent.includes(':')
    ) {
      return
    }

    let text = node.textContent
    const emojiMatches = text.match(this.emojiRegex)
    if (emojiMatches === null) {
      return
    }

    const firstMatchPosition = text.indexOf(emojiMatches[0])
    const firstNode = document.createTextNode(text.slice(0, firstMatchPosition))

    const newNodes = []

    for (let i = 0; i < emojiMatches.length; i++) {
      const emojiKey = emojiMatches[i]
      const emojiPath = this.emoji.get(emojiKey)
      if (emojiPath === undefined) {
        continue
      }

      // Build and emoji image.. iframe is sandboxed.. will file paths work?
      const dataURI = await getBase64FromImageUrl(emojiPath)
      const emojiImg = new Image()
      emojiImg.classList.add('emoji')
      emojiImg.src = dataURI

      newNodes.push(emojiImg)

      const matchPosition = text.indexOf(emojiMatches[0])
      text = text.slice(matchPosition + emojiKey.length)
    }

    if (firstNode === undefined) {
      return
    }

    const parent = node.parentElement
    node.textContent = '' // Hmm.. feels bad to just leave these empty nodes around, but if I try to replace or delete the tree walker stops because node is gone..
    parent.appendChild(firstNode)
    for (const newNode of newNodes) {
      parent.appendChild(newNode)
    }
  }
}

function getBase64FromImageUrl(url: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.src = url

    img.onload = function (e) {
      const image = e.currentTarget
      if (!(image instanceof Image)) {
        resolve('')
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height

      const ctx = canvas.getContext('2d')

      if (ctx === null) {
        resolve('')
        return
      }
      ctx.drawImage(image, 0, 0)

      resolve(canvas.toDataURL())
    }
  })
}

/**
 * Add backslash in front of regular expression special characters
 *
 * See Escaping in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 */
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
