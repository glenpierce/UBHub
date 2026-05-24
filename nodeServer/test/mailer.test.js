import { describe, it, expect, vi } from 'vitest';
import config from '../config.js';

// We'll dynamically import the mailer so we can mock the SES client when needed

describe('mailer service', () => {
  // it('sends via SES when EMAIL_PROVIDER=ses (mocked)', async () => {
  //   // Arrange - set provider to ses
  //   const originalProvider = config.EMAIL_PROVIDER;
  //   config.EMAIL_PROVIDER = 'ses';
  //
  //   // Mock @aws-sdk/client-ses SendEmailCommand and SESClient
  //   const sendMock = vi.fn().mockResolvedValue({});
  //   vi.mock('@aws-sdk/client-ses', async () => {
  //     return {
  //       SESClient: vi.fn().mockImplementation(() => ({ send: sendMock })),
  //       SendEmailCommand: vi.fn().mockImplementation((params) => ({ params })),
  //     };
  //   });
  //
  //   const { sendAdminNotification } = await import('../services/mailer.js');
  //
  //   // Act
  //   await sendAdminNotification({ newUserEmail: 'test@example.com', alias: 'Tester', institution: 'Test Institute', title: 'Dr', createdAt: new Date().toISOString() });
  //
  //   // Assert
  //   expect(sendMock).toHaveBeenCalled();
  //
  //   // Cleanup
  //   vi.unmock('@aws-sdk/client-ses');
  //   config.EMAIL_PROVIDER = originalProvider;
  // });

  it('sends via SMTP/Ethereal in default local mode (smoke)', async () => {
    const originalProvider = config.EMAIL_PROVIDER;
    config.EMAIL_PROVIDER = 'ethereal';

    const { sendAdminNotification } = await import('../services/mailer.js');

    // Act - call and ensure it does not throw (we don't assert on transporter internals)
    await sendAdminNotification({ newUserEmail: 'localtest@example.com', alias: 'Local Tester', institution: 'Local Inst', title: 'Ms', createdAt: new Date().toISOString() });

    config.EMAIL_PROVIDER = originalProvider;
  });
});

