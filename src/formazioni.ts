export function formazioneUrl(squadra: string): string {
  return `${import.meta.env.BASE_URL}squadre/${squadra.toLowerCase()}-formazione-schierabilita.jpg`;
}
