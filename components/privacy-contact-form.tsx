'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

export function PrivacyContactForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      toast({ title: 'Validation Error', description: 'Email and Message fields are required.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    logger.info('Privacy Contact Form Submission:', { email, message });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Replace with actual API call to submit the form data
    // try {
    //   const response = await fetch('/api/contact/privacy', { // Example endpoint
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, message }),
    //   });
    //   if (!response.ok) {
    //     const errorData = await response.json().catch(() => ({ message: 'Submission failed with no error message.' }));
    //     throw new Error(errorData.message || `API Error: ${response.status}`);
    //   }
    //   toast({ title: 'Message Sent', description: 'Thank you for contacting us regarding your privacy.' });
    //   setEmail('');
    //   setMessage('');
    // } catch (error) {
    //   logger.error('Privacy contact form submission failed:', error);
    //   toast({ title: 'Submission Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.', variant: 'destructive' });
    // } finally {
    //   setIsSubmitting(false);
    // }

    // For now, just show success and log
    toast({ title: 'Message Sent (Simulated)', description: 'Your privacy inquiry has been logged. We will implement a backend for this soon.' });
    setEmail('');
    setMessage('');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto py-6">
      <h4 className="text-lg font-semibold text-center mb-4">Contact Us About Privacy</h4>
      <div className="space-y-1">
        <Label htmlFor="privacy-email">Your Email</Label>
        <Input
          id="privacy-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="bg-background"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="privacy-message">Your Message</Label>
        <Textarea
          id="privacy-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please describe your privacy concern or question."
          required
          rows={5}
          className="bg-background"
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending...' : 'Send Privacy Inquiry'}
      </Button>
    </form>
  );
} 