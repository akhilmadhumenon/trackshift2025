import React from 'react';

interface MeetTheTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeamMember {
  name: string;
  role: string;
  email: string;
  specialty?: string;
}

const teamMembers: TeamMember[] = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Lead Computer Vision Engineer',
    email: 's.chen@f1-tyre-engine.com',
    specialty: 'Crack Detection & Depth Estimation'
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Senior 3D Reconstruction Specialist',
    email: 'm.rodriguez@f1-tyre-engine.com',
    specialty: 'TripoSR Pipeline & Mesh Generation'
  },
  {
    name: 'Emily Watson',
    role: 'Full Stack Developer',
    email: 'e.watson@f1-tyre-engine.com',
    specialty: 'React & Three.js Integration'
  },
  {
    name: 'James Park',
    role: 'Backend Engineer',
    email: 'j.park@f1-tyre-engine.com',
    specialty: 'API Development & Video Processing'
  },
  {
    name: 'Dr. Aisha Patel',
    role: 'Machine Learning Engineer',
    email: 'a.patel@f1-tyre-engine.com',
    specialty: 'Damage Classification & AI Insights'
  },
  {
    name: 'Thomas Müller',
    role: 'DevOps Engineer',
    email: 't.muller@f1-tyre-engine.com',
    specialty: 'Infrastructure & Deployment'
  }
];

const MeetTheTeamModal: React.FC<MeetTheTeamModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-ferrari-graphite border-2 border-ferrari-red rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ferrari-red sticky top-0 bg-ferrari-graphite z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-ferrari-red font-formula tracking-wide">
            MEET THE TEAM
          </h2>
          <button
            onClick={onClose}
            className="text-ferrari-white hover:text-ferrari-red text-3xl font-bold transition-colors duration-200 leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-ferrari-white mb-8 text-center text-lg">
            The F1 Tyre Visual Difference Engine is developed by a dedicated team of engineers and developers
            passionate about bringing cutting-edge technology to Formula 1 pit stop operations.
          </p>

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-ferrari-black p-5 rounded-lg border-2 border-ferrari-red hover:border-red-700 transition-all duration-200 hover:shadow-lg hover:shadow-ferrari-red/20"
              >
                {/* Member Avatar Placeholder */}
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-ferrari-graphite border-2 border-ferrari-red flex items-center justify-center">
                  <span className="text-ferrari-red text-2xl font-bold font-formula">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>

                {/* Member Info */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-ferrari-white mb-1 font-formula">
                    {member.name}
                  </h3>
                  <p className="text-ferrari-red text-sm font-semibold mb-3">
                    {member.role}
                  </p>
                  
                  {member.specialty && (
                    <p className="text-ferrari-white text-xs mb-3 italic opacity-80">
                      {member.specialty}
                    </p>
                  )}

                  {/* Contact */}
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-2 text-ferrari-white hover:text-ferrari-red text-sm transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="truncate">{member.email}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* General Contact Section */}
          <div className="mt-8 p-6 bg-ferrari-black rounded-lg border-2 border-ferrari-red">
            <h3 className="text-xl font-bold text-ferrari-red mb-4 text-center font-formula">
              GENERAL INQUIRIES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-ferrari-white text-sm mb-1">Technical Support</p>
                <a
                  href="mailto:support@f1-tyre-engine.com"
                  className="text-ferrari-red hover:text-red-700 transition-colors duration-200"
                >
                  support@f1-tyre-engine.com
                </a>
              </div>
              <div>
                <p className="text-ferrari-white text-sm mb-1">Business Inquiries</p>
                <a
                  href="mailto:info@f1-tyre-engine.com"
                  className="text-ferrari-red hover:text-red-700 transition-colors duration-200"
                >
                  info@f1-tyre-engine.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-ferrari-red sticky bottom-0 bg-ferrari-graphite">
          <button
            onClick={onClose}
            className="w-full bg-ferrari-red text-ferrari-white py-3 rounded-lg font-bold font-formula tracking-wide hover:bg-red-700 transition-colors duration-200"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetTheTeamModal;
