const sqsQuooler = require('sqs-quooler')
const tracer = require('dd-trace').init({
  logInjection: true,
  runtimeMetrics: true,
})

const { Queue } = sqsQuooler

class DDQueue extends Queue {
  constructor (options) {
    super(options)
  }

  startProcessing (processFunction, options = {}) {
    const ddProcess = (data, message) => {
      let childOf = undefined

      try {
        childOf = tracer.extract('text_map', JSON.parse(message.MessageAttributes._datadog.StringValue))
      } catch (_){}

      const tracedFunction = tracer.wrap(
        'sqs-quooler.process',
        {
          childOf,
          tags: { data },
          resource: options.resource || this.options.endpoint.split('/').pop(),
        },
        processFunction
      )

      return tracedFunction(data, message)
    }
  
    return super.startProcessing(
      ddProcess,
      options
    )
  }
}

module.exports = {
  ...sqsQuooler,
  Queue: DDQueue,
}
