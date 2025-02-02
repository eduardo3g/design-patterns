import { isBefore, subHours } from 'date-fns';

import User from '../models/User';
import Appointment from '../models/Appointments';

import Queue from '../../lib/Queue';
import Cache from '../../lib/Cache';

import CancellationMail from '../jobs/CancellationMail';

class CancelAppointmentService {
  async run({ provider_id, user_id }) {
    const appointment = await Appointment.findByPk(provider_id, {
      include: [
        // get provider data (name and e-mail) to mail him when a user cancels the appointment
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    /**
     * Users can only delete their OWN appointments.
     */
    if (appointment.user_id !== user_id) {
      throw new Error("You don't have permission to cancel this appointment.");
    }

    /**
     * Users can only cancel appointments if the current date-time is higher than 2 hours.
     * e.g: Current time: 12h30 | Appointment time: 14h00 => User cannot cancel the appointment.
     * e.g: Current time: 12h30 | Appointment time: 16h00 => User can cancel the appointment.
     */
    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      throw new Error('You can only cancel appointments 2 hours in advance.');
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    /**
     * Invalidate cache
     */
    await Cache.invalidatePrefix(`user:${user_id}:appointments`);

    return appointment;
  }
}

export default new CancelAppointmentService();
