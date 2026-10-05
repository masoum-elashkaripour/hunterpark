/**
 * The pictures on the /contact globe — the supplied archive, all 29.
 *
 * Each exists three ways in `public/contact/globe/`: a small thumbnail for the
 * globe itself (`NN.jpg`, ~520px), a large copy loaded only when a picture is
 * picked to fill the screen (`large/NN.jpg`, 1600px), and that same picture
 * blurred in the file (`blur/NN.jpg`) for the soft ground it becomes.
 * `w`/`h` are the thumbnail's pixels — the ratio is what matters.
 */
export type GlobePicture = { id: string; w: number; h: number };

export const GLOBE_PICTURES: GlobePicture[] = [
  { id: "01", w: 520, h: 367 },
  { id: "02", w: 520, h: 346 },
  { id: "03", w: 520, h: 462 },
  { id: "04", w: 520, h: 416 },
  { id: "05", w: 356, h: 520 },
  { id: "06", w: 347, h: 520 },
  { id: "07", w: 520, h: 347 },
  { id: "08", w: 416, h: 520 },
  { id: "09", w: 416, h: 520 },
  { id: "10", w: 305, h: 520 },
  { id: "11", w: 346, h: 520 },
  { id: "12", w: 520, h: 347 },
  { id: "13", w: 520, h: 347 },
  { id: "14", w: 390, h: 520 },
  { id: "15", w: 520, h: 347 },
  { id: "16", w: 520, h: 347 },
  { id: "17", w: 356, h: 520 },
  { id: "18", w: 347, h: 520 },
  { id: "19", w: 520, h: 347 },
  { id: "20", w: 347, h: 520 },
  { id: "21", w: 390, h: 520 },
  { id: "22", w: 520, h: 346 },
  { id: "23", w: 520, h: 347 },
  { id: "24", w: 416, h: 520 },
  { id: "25", w: 520, h: 347 },
  { id: "26", w: 520, h: 347 },
  { id: "27", w: 520, h: 293 },
  { id: "28", w: 520, h: 292 },
  { id: "29", w: 520, h: 390 },
];

export const globeSrc = {
  thumb: (p: GlobePicture) => `/contact/globe/${p.id}.jpg`,
  large: (p: GlobePicture) => `/contact/globe/large/${p.id}.jpg`,
  blur: (p: GlobePicture) => `/contact/globe/blur/${p.id}.jpg`,
};
