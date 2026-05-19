export interface Testimonial {
  nameKey: string;
  textKey: string;
  rating: number;
}

export const testimonials: Testimonial[] = Array.from({ length: 26 }, (_, i) => ({
  nameKey: `testimonials.items.${i}.name`,
  textKey: `testimonials.items.${i}.text`,
  rating: 5,
}));

