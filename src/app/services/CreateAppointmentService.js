import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import Appointment from '../models/Appointments';

import Notification from '../schemas/Notification';

class CreateAppointmentService {
  async run({ provider_id, user_id, date }) {
    /**
     * Check if provider_id is a provider
     */

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      throw new Error('Your can only create apointments with providers.');
    }

    if (provider_id === user_id) {
      throw new Error('You cannot create appointments with yourself.');
    }

    /**
     * Check for past dates
     */

    // e.g: if user sends hour = 19:30:00, the method startOfHour changes to 19:00:00
    const hourStart = startOfHour(parseISO(date));

    // if the user tries to schedule an appointment on a date before the current one, send error message.
    if (isBefore(hourStart, new Date())) {
      throw new Error('Past dates are not permited.');
    }

    /**
     * Check date availability
     */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      throw new Error('Appointment date is not available.');
    }

    const appointment = await Appointment.create({
      user_id,
      provider_id,
      date: hourStart,
    });

    /**
     * Notify appointments to provider
     */

    const user = await User.findByPk(user_id);
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}.`,
      user: provider_id, // provider which will be notified
    });

    return appointment;
  }
}

export default new CreateAppointmentService();
