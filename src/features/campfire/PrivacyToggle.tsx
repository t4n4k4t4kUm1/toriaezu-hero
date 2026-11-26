// 「ほかの人にクエスト名を見せない」の切り替え
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/profile'

type Props = {
  profile: Profile
  onChange: (changes: Partial<Profile>) => void
}

export function PrivacyToggle({ profile, onChange }: Props) {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const next = !profile.hide_quest_title
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ hide_quest_title: next })
      .eq('id', profile.id)
    setSaving(false)
    if (!error) onChange({ hide_quest_title: next })
  }

  return (
    <label className="privacy-toggle small">
      <input type="checkbox" checked={profile.hide_quest_title} disabled={saving} onChange={toggle} />
      ほかの人にクエスト名を見せない
    </label>
  )
}
