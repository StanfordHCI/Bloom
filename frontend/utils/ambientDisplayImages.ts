import img_1_0 from "../assets/bg/1-0.png";
import img_1_20 from "../assets/bg/1-20.png";
import img_1_40 from "../assets/bg/1-40.png";
import img_1_60 from "../assets/bg/1-60.png";
import img_1_80 from "../assets/bg/1-80.png";
import img_1_100 from "../assets/bg/1-100.png";
import img_2_0 from "../assets/bg/2-0.png";
import img_2_20 from "../assets/bg/2-20.png";
import img_2_40 from "../assets/bg/2-40.png";
import img_2_60 from "../assets/bg/2-60.png";
import img_2_80 from "../assets/bg/2-80.png";
import img_2_100 from "../assets/bg/2-100.png";
import img_3_0 from "../assets/bg/3-0.png";
import img_3_20 from "../assets/bg/3-20.png";
import img_3_40 from "../assets/bg/3-40.png";
import img_3_60 from "../assets/bg/3-60.png";
import img_3_80 from "../assets/bg/3-80.png";
import img_3_100 from "../assets/bg/3-100.png";
import img_4_0 from "../assets/bg/4-0.png";
import img_4_20 from "../assets/bg/4-20.png";
import img_4_40 from "../assets/bg/4-40.png";
import img_4_60 from "../assets/bg/4-60.png";
import img_4_80 from "../assets/bg/4-80.png";
import img_4_100 from "../assets/bg/4-100.png";

const images: Record<string, number> = {
  "1-0": img_1_0,
  "1-20": img_1_20,
  "1-40": img_1_40,
  "1-60": img_1_60,
  "1-80": img_1_80,
  "1-100": img_1_100,
  "2-0": img_2_0,
  "2-20": img_2_20,
  "2-40": img_2_40,
  "2-60": img_2_60,
  "2-80": img_2_80,
  "2-100": img_2_100,
  "3-0": img_3_0,
  "3-20": img_3_20,
  "3-40": img_3_40,
  "3-60": img_3_60,
  "3-80": img_3_80,
  "3-100": img_3_100,
  "4-0": img_4_0,
  "4-20": img_4_20,
  "4-40": img_4_40,
  "4-60": img_4_60,
  "4-80": img_4_80,
  "4-100": img_4_100
};

export function getImage(weekIndex: number, progress: number) {
  return images[`${weekIndex}-${progress}`] || null;
}

export { img_1_0 };