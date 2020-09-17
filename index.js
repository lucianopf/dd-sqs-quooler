const sqsQuooler = require('sqs-quooler')
const tracer = require('dd-trace').init({
  logInjection: true,
  runtimeMetrics: true,
})

const { Queue } = sqsQuooler

function injectTags (data) {
  const scope = tracer.scope()

  if (scope.active()) {
    scope.active().addTags({ data })
  }
}

class DDQueue extends Queue {
  constructor (options) {
    super(options)
  }

  startProcessing (processFunction, options = {}) {
    const injectedTracedFunction = (data, message = {}) => {
      injectTags(data)
      return processFunction(data, message)
    }
  
    const tracedFunction = tracer.wrap(
      'sqs-quooler.process',
      injectedTracedFunction
    )
  
    return super.startProcessing(
      tracedFunction,
      options
    )
  }
}

module.exports = {
  ...sqsQuooler,
  Queue: DDQueue,
}
