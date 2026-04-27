export interface CompanyDocument {
  id: string
  title: string
  category: 'Safety' | 'HR & Policies' | 'Training & Procedures'
  fileName: string
  filePath: string
  pages: number
}

export const companyDocuments: CompanyDocument[] = [
  // Safety Documents
  { id: 'd1', title: 'Health & Safety Manual 2025', category: 'Safety', fileName: 'Richco Health & Safety Manual - 2025.pdf', filePath: '/docs/Richco Health & Safety Manual - 2025.pdf', pages: 0 },
  { id: 'd2', title: 'Health & Safety Policy 2025', category: 'Safety', fileName: 'Richco Health & Safety Policy 2025.pdf', filePath: '/docs/Richco Health & Safety Policy 2025.pdf', pages: 0 },
  { id: 'd3', title: 'Aerial Lift Operation', category: 'Safety', fileName: 'Richco - Aerial Lift Operation - 2022.pdf', filePath: '/docs/Richco - Aerial Lift Operation - 2022.pdf', pages: 0 },
  { id: 'd4', title: 'Concrete & Masonry Safety', category: 'Safety', fileName: 'Richco - Concrete & Masonry Safety - 2022.pdf', filePath: '/docs/Richco - Concrete & Masonry Safety - 2022.pdf', pages: 0 },
  { id: 'd5', title: 'Forklift Operation Policy', category: 'Safety', fileName: 'Richco - Forklift Policy - 2022.pdf', filePath: '/docs/Richco - Forklift Policy - 2022.pdf', pages: 0 },
  { id: 'd6', title: 'Hot Work Safety Program', category: 'Safety', fileName: 'Richco - Hot Work Safety Program - 2022.pdf', filePath: '/docs/Richco - Hot Work Safety Program - 2022.pdf', pages: 0 },
  { id: 'd7', title: 'Heat Illness Prevention Plan', category: 'Safety', fileName: 'Richco - Heat Illness Prevention Plan - 2022.pdf', filePath: '/docs/Richco - Heat Illness Prevention Plan - 2022.pdf', pages: 0 },
  { id: 'd8', title: 'Work Zone Safety Program', category: 'Safety', fileName: 'Richco - Work Zone Safety Program - 2022.pdf', filePath: '/docs/Richco - Work Zone Safety Program - 2022.pdf', pages: 0 },
  { id: 'd9', title: 'Working Alone Program', category: 'Safety', fileName: 'Richco - Working Alone Program - 2022.pdf', filePath: '/docs/Richco - Working Alone Program - 2022.pdf', pages: 0 },
  { id: 'd10', title: 'Silica Awareness Training', category: 'Safety', fileName: 'Richco - Silica Awareness 2022.pdf', filePath: '/docs/Richco - Silica Awareness 2022.pdf', pages: 0 },
  { id: 'd11', title: 'COVID-19 Guidelines', category: 'Safety', fileName: 'Richco - COVID 19 Guidelines.pdf', filePath: '/docs/Richco - COVID 19 Guidelines.pdf', pages: 0 },

  // HR & Policies
  { id: 'hr1', title: 'Employee Handbook 2025', category: 'HR & Policies', fileName: 'Richco International Employee Handbook 2025.pdf', filePath: '/docs/Richco International Employee Handbook 2025.pdf', pages: 0 },
  { id: 'hr2', title: 'Employment Guidelines Policy', category: 'HR & Policies', fileName: 'Richco – Employment Guidelines  Policy.pdf', filePath: '/docs/Richco – Employment Guidelines  Policy.pdf', pages: 0 },
  { id: 'hr3', title: 'Employment Agreement - At Will', category: 'HR & Policies', fileName: 'Employment Agreement - At Will.pdf', filePath: '/docs/Employment Agreement - At Will.pdf', pages: 0 },
  { id: 'hr4', title: 'Employee NDA', category: 'HR & Policies', fileName: 'Employee - NDA.pdf', filePath: '/docs/Employee - NDA.pdf', pages: 0 },
  { id: 'hr5', title: 'Vacation Policy 2025', category: 'HR & Policies', fileName: 'Employee Vacation 2025.pdf', filePath: '/docs/Employee Vacation 2025.pdf', pages: 0 },
  { id: 'hr6', title: 'Company Vehicle Policy', category: 'HR & Policies', fileName: 'Company Vehicle Policy.pdf', filePath: '/docs/Company Vehicle Policy.pdf', pages: 0 },
  { id: 'hr7', title: 'Payment Card Policy', category: 'HR & Policies', fileName: 'Richco Payment Card Policy .pdf', filePath: '/docs/Richco Payment Card Policy .pdf', pages: 0 },
  { id: 'hr8', title: 'Handbook Acknowledgment', category: 'HR & Policies', fileName: 'Acknowledge & Acceptance of Richco Handbook.pdf', filePath: '/docs/Acknowledge & Acceptance of Richco Handbook.pdf', pages: 0 },

  // Training & Procedures
  { id: 'tr1', title: 'Employee Orientation Guide', category: 'Training & Procedures', fileName: 'Richco Employee Orientation - English Version.pdf', filePath: '/docs/Richco Employee Orientation - English Version.pdf', pages: 0 },
  { id: 'tr2', title: 'Site Requirements', category: 'Training & Procedures', fileName: 'Richco Site Requirements.pdf', filePath: '/docs/Richco Site Requirements.pdf', pages: 0 },
  { id: 'tr3', title: 'Breaktime Policy & Procedures', category: 'Training & Procedures', fileName: 'Richco\'s Breaktime Policy and Procedures.pdf', filePath: '/docs/Richco\'s Breaktime Policy and Procedures.pdf', pages: 0 },
  { id: 'tr4', title: 'New Worker Mentoring Program', category: 'Training & Procedures', fileName: 'Richco\'s Monitoring & Mentoring of New or Inexperienced Workers.pdf', filePath: '/docs/Richco\'s Monitoring & Mentoring of New or Inexperienced Workers.pdf', pages: 0 },
  { id: 'tr5', title: 'Cleaning Guide - Aqua Shore', category: 'Training & Procedures', fileName: 'Cleaning Guide - Aqua shore system 2025.pdf', filePath: '/docs/Cleaning Guide - Aqua shore system 2025.pdf', pages: 0 },
  { id: 'tr6', title: 'Cleaning Guide - Artificial Turf', category: 'Training & Procedures', fileName: 'Cleaning Guide Artificial Turf 2025.pdf', filePath: '/docs/Cleaning Guide Artificial Turf 2025.pdf', pages: 0 },
  { id: 'tr7', title: 'Cleaning Guide - Bonded Stone', category: 'Training & Procedures', fileName: 'Cleaning Guide Bonded Stone 2025.pdf', filePath: '/docs/Cleaning Guide Bonded Stone 2025.pdf', pages: 0 },
  { id: 'tr8', title: 'Cleaning Guide - Decorative Concrete', category: 'Training & Procedures', fileName: 'Cleaning Guide Decorative Concrete Mosaic System 2025.pdf', filePath: '/docs/Cleaning Guide Decorative Concrete Mosaic System 2025.pdf', pages: 0 },
  { id: 'tr9', title: 'Cleaning Guide - Resin Flooring', category: 'Training & Procedures', fileName: 'Cleaning Guide Resin Flooring System 2025.pdf', filePath: '/docs/Cleaning Guide Resin Flooring System 2025.pdf', pages: 0 },
  { id: 'tr10', title: 'Cleaning Guide - Rubber Top', category: 'Training & Procedures', fileName: 'Cleaning Guide Rubber Top  2025.pdf', filePath: '/docs/Cleaning Guide Rubber Top  2025.pdf', pages: 0 },
  { id: 'tr11', title: 'Cleaning Guide - Stamped Overlay', category: 'Training & Procedures', fileName: 'Cleaning Guide Stamped Overlay 2025.pdf', filePath: '/docs/Cleaning Guide Stamped Overlay 2025.pdf', pages: 0 },
  { id: 'tr12', title: 'Cleaning Regime (Porviva)', category: 'Training & Procedures', fileName: 'Cleaning Regime (For Porviva).pdf', filePath: '/docs/Cleaning Regime (For Porviva).pdf', pages: 0 },
]
