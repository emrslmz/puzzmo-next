import { LANGUAGES, setLanguage, t } from '@/core/i18n'
import { state } from '@/core/state'
import { addText, makePressable } from './components'
import { pillTexture } from './textures'

export const CONTACT_EMAIL = 'shorproduction@gmail.com'

/** Flag grid language picker. Resolves true if the language changed. */
export async function openLanguagePicker(scene) {
  let selected = state.settings.language
  const ok = await scene.scene.get('Overlay').modal({
    title: t('select_language'),
    width: 900,
    content: (s, container, width, y0) => {
      const cols = 5
      const cellW = width / cols
      const cellH = 104
      const tiles = []
      LANGUAGES.forEach((lang, i) => {
        const cx = -width / 2 + cellW * (i % cols) + cellW / 2
        const cy = y0 + Math.floor(i / cols) * cellH + cellH / 2
        const tile = s.add.container(cx, cy)
        const bg = s.add.image(0, 0, pillTexture(s, cellW - 14, cellH - 14, '#ffffff', '#c9a26b')).setDisplaySize(cellW - 14, cellH - 14)
        const sel = s.add.image(0, 0, pillTexture(s, cellW - 14, cellH - 14, '#ffe36b', '#c76d00')).setDisplaySize(cellW - 14, cellH - 14)
        const flag = s.add.image(0, -14, 'ui', lang.flag)
        flag.setScale(52 / flag.width)
        const label = addText(s, 0, 25, lang.label, { size: 22, color: '#5a3410', stroke: false, shadow: false, maxWidth: cellW - 30 })
        tile.add([bg, sel, flag, label])
        tile.setSize(cellW - 14, cellH - 14)
        sel.setVisible(lang.code === selected)
        tiles.push({ code: lang.code, sel })
        makePressable(tile, () => {
          selected = lang.code
          tiles.forEach(tl => tl.sel.setVisible(tl.code === selected))
        })
        container.add(tile)
      })
      return Math.ceil(LANGUAGES.length / cols) * cellH
    },
    buttons: [
      { label: t('cancel'), color: 'gray', value: false },
      { label: t('choose'), color: 'green', value: true },
    ],
    dismissValue: false,
  })
  if (ok && selected !== state.settings.language) {
    state.updateSettings({ language: selected })
    setLanguage(selected)
    return true
  }
  return false
}

/** Scrollable-free privacy policy (text is short enough to paginate). */
export async function openPrivacyPolicy(scene) {
  const overlay = scene.scene.get('Overlay')
  const sections = [
    [t('privacyPolicyTitle1'), t('privacyPolicyText1')],
    [t('privacyPolicyTitle2'), t('privacyPolicyText2')],
    [t('privacyPolicyTitle3'), t('privacyPolicyText3')],
    [t('privacyPolicyTitle4'), t('privacyPolicyText4')],
    [t('privacyPolicyTitle5'), `${t('privacyPolicyText5')}\n\n${t('privacyPolicyText6')}\n${t('email')}: ${CONTACT_EMAIL}`],
  ]
  for (let i = 0; i < sections.length; i++) {
    const [title, text] = sections[i]
    const res = await overlay.modal({
      title: t('privacy_policy'),
      message: `${title}\n\n${text}`,
      messageSize: 26,
      width: 900,
      dismissValue: 'close',
      buttons: i < sections.length - 1
        ? [{ label: `${t('next')}  ${i + 1}/${sections.length}`, color: 'blue', value: 'next' }]
        : [{ label: t('ok'), color: 'green', value: 'close' }],
    })
    if (res === 'close')
      break
  }
}
