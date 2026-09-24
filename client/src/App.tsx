/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudentProfile } from './types';
import { getStoredProfile, saveStoredProfile } from './utils/storage';
import { OnboardingModal } from './components/OnboardingModal';
import { Navbar } from './components/Navbar';
import { ChatTutor } from './components/ChatTutor';
import { ExerciseReviewer } from './components/ExerciseReviewer';
import { ExamSimulator } from './components/ExamSimulator';
import { StudyNotesModule } from './components/StudyNotesModule';
import { ProgressDashboard } from './components/ProgressDashboard';
import { PwaManager } from './components/PwaManager';

export default function App() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'review' | 'quiz' | 'notes' | 'progress'>('chat');
  const [exerciseToReview, setExerciseToReview] = useState<string>('');

  // Check stored profile on initial load
  useEffect(() => {
    const stored = getStoredProfile();
    if (stored) {
      setProfile(stored);
      // Los perfiles creados por versiones antiguas no tienen confirmación de
      // edad. Se reabre el selector para que el 15 guardado no se imponga.
      if (!stored.ageConfirmed) setIsOnboardingOpen(true);
    } else {
      // Must prompt onboarding before entering
      setIsOnboardingOpen(true);
    }
    setIsHydrated(true);
  }, []);

  const handleProfileComplete = (newProfile: StudentProfile) => {
    if (!saveStoredProfile(newProfile)) {
      window.alert('No se pudo guardar el perfil en este dispositivo. Revisa los permisos de almacenamiento e inténtalo de nuevo.');
      return;
    }
    setProfile(newProfile);
    setIsOnboardingOpen(false);
  };

  const handleUpdateSubject = (newSubject: string) => {
    if (!profile) return;
    const previous = profile;
    const updated: StudentProfile = { ...profile, subject: newSubject };
    setProfile(updated);
    if (!saveStoredProfile(updated)) setProfile(previous);
  };

  const handleSendToReview = (text: string) => {
    setExerciseToReview(text);
    setActiveTab('review');
  };

  const handleSelectDifferentProfile = (p: StudentProfile) => {
    setProfile(p);
    saveStoredProfile(p);
    setExerciseToReview('');
    setActiveTab('chat');
    if (!p.ageConfirmed) setIsOnboardingOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <PwaManager />
      
      {/* Onboarding Modal - Always active if no profile or requested */}
      <OnboardingModal
        isOpen={isHydrated && (isOnboardingOpen || !profile)}
        initialProfile={profile}
        onComplete={handleProfileComplete}
        onCancel={profile ? () => setIsOnboardingOpen(false) : undefined}
      />

      {/* Main App Layout if Profile exists */}
      {profile && (
        <>
          <Navbar
            profile={profile}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onEditProfile={() => setIsOnboardingOpen(true)}
            onUpdateSubject={handleUpdateSubject}
          />

          <main className="flex min-h-0 flex-1 flex-col pb-10">
            {activeTab === 'chat' && (
              <ChatTutor
                profile={profile}
                onSendToReview={handleSendToReview}
              />
            )}

            {activeTab === 'review' && (
              <ExerciseReviewer
                profile={profile}
                initialExercise={exerciseToReview}
              />
            )}

            {activeTab === 'quiz' && (
              <ExamSimulator
                profile={profile}
              />
            )}

            {activeTab === 'notes' && (
              <StudyNotesModule
                profile={profile}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressDashboard
                currentProfile={profile}
                onSelectProfile={handleSelectDifferentProfile}
                onNewProfile={() => {
                  setProfile(null);
                  setExerciseToReview('');
                  setActiveTab('chat');
                  setIsOnboardingOpen(true);
                }}
                onEditCurrentProfile={() => setIsOnboardingOpen(true)}
              />
            )}
          </main>
        </>
      )}

    </div>
  );
}
