import React from 'react';

export default function About() {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h1 className="font-display text-xl font-semibold">About KCET Agriculture Prep</h1>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Our Mission</h2>
              <p className="text-slate-600">
                KCET Agriculture Prep is dedicated to helping students excel in the Karnataka Common Entrance Test for Agriculture courses. 
                We provide comprehensive study materials, practice tests, and interactive learning resources to ensure your success.
              </p>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">What We Offer</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>Comprehensive study materials for all KCET Agriculture subjects</li>
                <li>Interactive mock tests with instant feedback</li>
                <li>Previous year question papers with solutions</li>
                <li>Video tutorials and learning resources</li>
                <li>Progress tracking and performance analytics</li>
                <li>Personalized learning recommendations</li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Why Choose Us</h2>
              <p className="text-slate-600 mb-3">
                Our platform is designed by experienced educators and KCET experts to provide the best preparation experience. 
                We focus on:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>Quality content aligned with the latest KCET syllabus</li>
                <li>Interactive learning methods for better retention</li>
                <li>Regular updates with new content and features</li>
                <li>24/7 access to learning materials</li>
                <li>Affordable pricing for all students</li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Contact Information</h2>
              <div className="space-y-2 text-slate-600">
                <p>
                  <strong>Email:</strong>{' '}
                  <a className="font-semibold" href="mailto:chandupavanz12@gmail.com">
                    chandupavanz12@gmail.com
                  </a>
                </p>
                <p><strong>Address:</strong> Bangalore, Karnataka, India</p>
              </div>
            </div>
            
            <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
              <p className="text-sm text-secondary-800">
                <strong>Version:</strong> 1.0.0 | Last Updated: January 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
