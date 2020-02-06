import User from '../models/User';
import File from '../models/File';

import Cache from '../../lib/Cache';

class ProviderController {
  async index(req, res) {
    const cached = await Cache.get('providers');

    if (cached) {
      return res.json(cached);
    }

    const providers = await User.findAll({
      where: { provider: true },
      attributes: ['id', 'name', 'email', 'avatar_id'],
      include: [
        // return data of the 'avatar_id' relationship (from 'files' table)
        {
          model: File,
          as: 'avatar',
          attributes: ['name', 'path', 'url'],
        },
      ],
    });

    await Cache.set('providers', providers);

    return res.json(providers);
  }
}

export default new ProviderController();
