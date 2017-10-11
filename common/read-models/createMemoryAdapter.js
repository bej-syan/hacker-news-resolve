import hash from 'object-hash'
import clone from 'clone'

export default function createMemoryAdapter() {
  const repository = new Map()

  const getKey = onDemandOptions =>
    typeof onDemandOptions !== 'undefined'
      ? hash(onDemandOptions, { unorderedArrays: true, unorderedSets: true })
      : hash(null, { unorderedArrays: true, unorderedSets: true })

  const init = (onDemandOptions, persistDonePromise, onDestroy) => {
    const key = getKey(onDemandOptions)
    if (repository.get(key))
      throw new Error(`State for '${key}' already initialized`)

    repository.set(key, {
      internalState: new Map(),
      internalError: null,
      api: {
        getReadable: async () => {
          await persistDonePromise
          return repository.get(key).internalState
        },
        getError: async () => repository.get(key).internalError
      },
      onDestroy
    })
  }

  const buildProjection = collections => {
    const callbacks = collections.reduce(
      (callbacks, { name, eventHandlers, initialState }) =>
        Object.keys(eventHandlers).reduce((result, eventType) => {
          result[eventType] = (result[eventType] || []).concat({
            name,
            handler: eventHandlers[eventType],
            initialState
          })
          return result
        }, callbacks),
      {}
    )

    return Object.keys(callbacks).reduce((projection, eventType) => {
      projection[eventType] = (event, onDemandOptions) => {
        const key = getKey(onDemandOptions)
        callbacks[eventType].forEach(({ name, handler, initialState }) => {
          const state = repository.get(key).internalState

          if (!state.has(name)) {
            state.set(name, initialState)
          }

          try {
            state.set(name, handler(state.get(name), event))
          } catch (error) {
            repository.get(key).internalError = error
          }
        })
      }
      return projection
    }, {})
  }

  const get = onDemandOptions => {
    const key = getKey(onDemandOptions)
    return repository.has(key) ? repository.get(key).api : null
  }

  const reset = onDemandOptions => {
    const key = getKey(onDemandOptions)
    if (!repository.has(key)) return
    repository.get(key).onDestroy()
    repository.delete(key)
  }

  const buildRead = read => async (collectionName, aggregateIds) => {
    const result = await read({ aggregateIds })
    return clone(result.get(collectionName))
  }

  return {
    buildRead,
    buildProjection,
    init,
    get,
    reset
  }
}