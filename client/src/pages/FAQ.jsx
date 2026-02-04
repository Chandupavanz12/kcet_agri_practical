import React from 'react';

export default function FAQ() {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h1 className="font-display text-xl font-semibold">Frequently Asked Questions</h1>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">How do I access study materials?</h3>
              <p className="text-slate-600">You can access study materials by clicking on "Study Materials" in the sidebar menu. All materials are organized by subject for easy navigation.</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">How are mock tests structured?</h3>
              <p className="text-slate-600">Mock tests are designed to simulate the actual KCET exam. Each test contains multiple-choice questions with a time limit. You can review your results immediately after completion.</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Can I retake tests?</h3>
              <p className="text-slate-600">Yes, you can retake mock tests multiple times. Each attempt will be recorded in your progress report to help you track improvement.</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">How do I contact support?</h3>
              <p className="text-slate-600">
                For technical support or questions about the platform, please email{' '}
                <a className="font-semibold" href="mailto:chandupavanz12@gmail.com">
                  chandupavanz12@gmail.com
                </a>
                .
              </p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Is my progress saved?</h3>
              <p className="text-slate-600">Yes, all your test scores, progress, and study material access are automatically saved to your account. You can view your progress anytime in the Results section.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">What subjects are covered?</h3>
              <p className="text-slate-600">We cover all KCET Agriculture subjects including Physics, Chemistry, Mathematics, and Biology with comprehensive study materials and practice tests.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
