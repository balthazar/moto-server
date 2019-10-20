import mongoose, { Schema } from 'mongoose'

export default mongoose.model(
  'Trace',
  new Schema({
    time: Date,

    lat: Number,
    lon: Number,
    alt: Number,
    speed: Number,
    climb: Number,
  }),
)
