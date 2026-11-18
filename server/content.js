const { ObjectId } = require('mongodb')
const { threadKey, Problem } = require('./core')

function contentStore(mongo) {
  const literal = (value) => ({
    $regex: value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    $options: 'i',
  })
  async function page(collection, filter, before) {
    if (before && !/^[a-f\d]{24}$/i.test(before))
      throw new Problem(422, 'INVALID_CURSOR')
    if (before) filter._id = { $lt: new ObjectId(before) }
    const rows = await mongo
      .collection(collection)
      .find(filter)
      .sort({ _id: -1 })
      .limit(31)
      .toArray()
    const items = rows.slice(0, 30)
    return { items, next: rows.length > 30 ? String(items.at(-1)._id) : null }
  }
  async function insert(collection, doc) {
    const result = await mongo.collection(collection).insertOne(doc)
    return { ...doc, _id: result.insertedId }
  }
  return {
    jobs: ({ q = '', location = '', type, page = 1, mine, memberId }) => {
      const filter = mine
        ? { posterId: memberId }
        : { status: 'open', closesAt: { $gt: new Date() } }
      if (q) filter.$or = ['title', 'company', 'field'].map((field) => ({ [field]: literal(q) }))
      if (location) filter.location = literal(location)
      if (type) filter.type = type
      return mongo.collection('jobs').find(filter)
        .project({ seedKey: 0 })
        .sort({ publishedAt: -1, _id: -1 }).skip((page - 1) * 30).limit(30).toArray()
    },
    publishJob: (author, data) => insert('jobs', {
      ...data, closesAt: new Date(data.closesAt), status: 'open',
      posterId: author.id, posterName: author.name, publishedAt: new Date(),
    }),
    updateJob: async (authorId, key, data) => {
      const filter = { _id: new ObjectId(key), posterId: authorId }
      const existing = await mongo.collection('jobs').findOne(filter)
      if (!existing) throw new Problem(404, 'JOB_UNAVAILABLE')
      const updates = { ...data, updatedAt: new Date() }
      if (data.closesAt) updates.closesAt = new Date(data.closesAt)
      if (data.status === 'open' && (updates.closesAt || existing.closesAt) <= new Date())
        throw new Problem(422, 'FUTURE_CLOSE_REQUIRED')
      return mongo.collection('jobs').findOneAndUpdate(filter, { $set: updates }, { returnDocument: 'after', projection: { seedKey: 0 } })
    },
    inbox: (memberId, pageNumber) =>
      mongo
        .collection('messages')
        .aggregate([
          {
            $match: {
              $or: [{ senderId: memberId }, { recipientId: memberId }],
            },
          },
          { $sort: { _id: -1 } },
          { $group: { _id: '$thread', last: { $first: '$$ROOT' } } },
          { $sort: { 'last._id': -1 } },
          { $skip: (pageNumber - 1) * 30 },
          { $limit: 30 },
        ])
        .toArray(),
    announcements: (before) => page('announcements', {}, before),
    publish: (author, title, body) =>
      insert('announcements', {
        authorId: author.id,
        authorName: author.name,
        title,
        body,
        publishedAt: new Date(),
      }),
    messages: (memberId, peerId, before) =>
      page('messages', { thread: threadKey(memberId, peerId) }, before),
    existingThread: (memberId, peerId) =>
      mongo
        .collection('messages')
        .findOne(
          { thread: threadKey(memberId, peerId) },
          { projection: { _id: 1 } },
        ),
    send: (sender, recipient, body) =>
      insert('messages', {
        thread: threadKey(sender.id, recipient.id),
        senderId: sender.id,
        senderName: sender.name,
        recipientId: recipient.id,
        recipientName: recipient.name,
        body,
        sentAt: new Date(),
      }),
  }
}
module.exports = { contentStore }
