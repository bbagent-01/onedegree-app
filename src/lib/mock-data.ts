export interface Listing {
  id: string;
  title: string;
  area: string;
  pricePerNight: number;
  availableFrom: string;
  availableTo: string;
  heroImage: string;
  trustScore: number;
  completedStays: number;
  averageRating: number;
  vouchCount: number;
  bedrooms: number;
  maxGuests: number;
}

export const mockListings: Listing[] = [
  {
    id: "1",
    title: "Modern Loft in Arts District",
    area: "Arts District, Downtown",
    pricePerNight: 185,
    availableFrom: "2026-04-15",
    availableTo: "2026-06-30",
    heroImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
    trustScore: 92,
    completedStays: 47,
    averageRating: 4.9,
    vouchCount: 12,
    bedrooms: 2,
    maxGuests: 4,
  },
  {
    id: "2",
    title: "Hillside Retreat with City Views",
    area: "Silver Lake",
    pricePerNight: 245,
    availableFrom: "2026-05-01",
    availableTo: "2026-08-15",
    heroImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
    trustScore: 78,
    completedStays: 23,
    averageRating: 4.7,
    vouchCount: 8,
    bedrooms: 3,
    maxGuests: 6,
  },
  {
    id: "3",
    title: "Beachfront Studio",
    area: "Venice Beach",
    pricePerNight: 165,
    availableFrom: "2026-04-20",
    availableTo: "2026-05-31",
    heroImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
    trustScore: 45,
    completedStays: 8,
    averageRating: 4.3,
    vouchCount: 3,
    bedrooms: 1,
    maxGuests: 2,
  },
  {
    id: "4",
    title: "Converted Warehouse Space",
    area: "Williamsburg",
    pricePerNight: 320,
    availableFrom: "2026-06-01",
    availableTo: "2026-09-30",
    heroImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop",
    trustScore: 97,
    completedStays: 89,
    averageRating: 5.0,
    vouchCount: 24,
    bedrooms: 4,
    maxGuests: 8,
  },
  {
    id: "5",
    title: "Garden Cottage",
    area: "Echo Park",
    pricePerNight: 135,
    availableFrom: "2026-04-10",
    availableTo: "2026-07-15",
    heroImage: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop",
    trustScore: 28,
    completedStays: 2,
    averageRating: 4.0,
    vouchCount: 1,
    bedrooms: 1,
    maxGuests: 2,
  },
  {
    id: "6",
    title: "Penthouse with Rooftop Access",
    area: "DTLA Financial District",
    pricePerNight: 425,
    availableFrom: "2026-05-15",
    availableTo: "2026-12-31",
    heroImage: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&h=600&fit=crop",
    trustScore: 85,
    completedStays: 56,
    averageRating: 4.8,
    vouchCount: 15,
    bedrooms: 3,
    maxGuests: 6,
  },
];
