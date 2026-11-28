import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function Root({ children }: { children: React.ReactNode }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'StudyHack',
    alternateName: ['StudyHack KCET', 'KCET Agri Practical', 'StudyHack Student'],
    description:
      'StudyHack offers free complete preparation guidance for KCET, KCET Agri Practical, NEET, and PUC (11th & 12th) with chapter study materials, timed mock tests, previous year question papers (PYQs), and video lectures.',
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <title>
          StudyHack — KCET, Agri Practical, NEET &amp; PUC Free Preparation, Study Materials &amp; Mock Tests
        </title>
        <meta
          name="description"
          content="StudyHack is your complete free preparation hub for KCET, KCET Agri Practical, NEET, and PUC. Access free chapter study materials, previous year question papers (PYQs), timed mock tests, practical video guidance, and instant analytics."
        />
        <meta
          name="keywords"
          content="StudyHack, Study Hack, KCET, Agri Practical, KCET Agri Practical, NEET, PUC, free study materials, mock tests, previous year questions, agri previous year questions, Karnataka CET, agriculture practical exam"
        />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#059669" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="StudyHack" />
        <meta
          property="og:title"
          content="StudyHack — KCET, Agri Practical, NEET & PUC Free Preparation Hub"
        />
        <meta
          property="og:description"
          content="Free complete preparation guidance for KCET, KCET Agri Practical, NEET, and PUC: study materials, mock tests, PYQs, and video lectures."
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="StudyHack — KCET, Agri Practical, NEET & PUC Preparation"
        />
        <meta
          name="twitter:description"
          content="Free study materials, mock tests, previous year questions, and video guidance for KCET, Agri Practical, NEET, and PUC."
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <ScrollViewStyleReset />
        <style>{`
          input:focus, textarea:focus, select:focus {
            outline: none !important;
            box-shadow: none !important;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}

