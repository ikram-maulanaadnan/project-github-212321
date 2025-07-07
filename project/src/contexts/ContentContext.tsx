import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Feature, Package, Testimonial, FAQ, HeroContent } from '../types';

const API_URL = 'http://localhost:8080/api';

interface ContentContextType {
  heroContent: HeroContent | null;
  features: Feature[];
  packages: Package[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  isLoading: boolean;
  error: string | null;
  refetchData: () => Promise<void>;
  updateHeroContent: (data: HeroContent) => Promise<void>;
  addFeature: (data: Omit<Feature, 'id'>) => Promise<void>;
  updateFeature: (id: string, data: Omit<Feature, 'id'>) => Promise<void>;
  deleteFeature: (id: string) => Promise<void>;
  addPackage: (data: Omit<Package, 'id'>) => Promise<void>;
  updatePackage: (id: string, data: Omit<Package, 'id'>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  addTestimonial: (data: Omit<Testimonial, 'id'>) => Promise<void>;
  updateTestimonial: (id: string, data: Omit<Testimonial, 'id'>) => Promise<void>;
  deleteTestimonial: (id: string) => Promise<void>;
  addFAQ: (data: Omit<FAQ, 'id'>) => Promise<void>;
  updateFAQ: (id: string, data: Omit<FAQ, 'id'>) => Promise<void>;
  deleteFAQ: (id: string) => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
};

const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json', ...options.headers, ...(token && { 'Authorization': `Bearer ${token}` }) };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from server.' }));
        throw new Error(errorData.message || `Request failed: ${response.status}`);
    }
    if (response.headers.get("content-type")?.includes("application/json")) { return response.json(); }
    return {};
};

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [heroContent, setHeroContent] = useState<HeroContent | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [heroData, featuresData, packagesData, testimonialsData, faqsData] = await Promise.all([
        fetch(`${API_URL}/hero`).then(res => res.json()),
        fetch(`${API_URL}/features`).then(res => res.json()),
        fetch(`${API_URL}/packages`).then(res => res.json()),
        fetch(`${API_URL}/testimonials`).then(res => res.json()),
        fetch(`${API_URL}/faqs`).then(res => res.json()),
      ]);
      setHeroContent(heroData);
      setFeatures(featuresData);
      setPackages(packagesData);
      setTestimonials(testimonialsData);
      setFaqs(faqsData);
    } catch (err: any) {
      console.error("Gagal mengambil konten dari backend:", err);
      setError(err.message || 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refetchData(); }, [refetchData]);

  const updateHeroContent = async (data: HeroContent) => { await authFetch(`${API_URL}/hero`, { method: 'PUT', body: JSON.stringify(data) }); await refetchData(); };
  const genericCrud = <T extends {id: string}>(endpoint: string) => ({
    add: async (data: Omit<T, 'id'>) => { await authFetch(`${API_URL}/${endpoint}`, { method: 'POST', body: JSON.stringify(data) }); await refetchData(); },
    update: async (id: string, data: Omit<T, 'id'>) => { await authFetch(`${API_URL}/${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(data) }); await refetchData(); },
    remove: async (id: string) => { await authFetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE' }); await refetchData(); },
  });

  const value: ContentContextType = {
    heroContent, features, packages, testimonials, faqs, isLoading, error, refetchData, updateHeroContent,
    addFeature: genericCrud<Feature>('features').add, updateFeature: genericCrud<Feature>('features').update, deleteFeature: genericCrud<Feature>('features').remove,
    addPackage: genericCrud<Package>('packages').add, updatePackage: genericCrud<Package>('packages').update, deletePackage: genericCrud<Package>('packages').remove,
    addTestimonial: genericCrud<Testimonial>('testimonials').add, updateTestimonial: genericCrud<Testimonial>('testimonials').update, deleteTestimonial: genericCrud<Testimonial>('testimonials').remove,
    addFAQ: genericCrud<FAQ>('faqs').add, updateFAQ: genericCrud<FAQ>('faqs').update, deleteFAQ: genericCrud<FAQ>('faqs').remove,
  };

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};
