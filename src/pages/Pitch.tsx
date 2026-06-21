import { PitchDeck } from '../components/pitch/PitchDeck'

// Full-bleed route (/pitch): the timed 4-minute pitch deck, separate from the
// marketing landing. Renders outside the shared chrome, like the landing.
export default function Pitch() {
  return <PitchDeck />
}
