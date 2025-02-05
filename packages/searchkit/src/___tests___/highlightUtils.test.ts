import { getHighlightFields, highlightTerm, shouldHighlightField } from '../highlightUtils'
import { ElasticsearchHit } from '../types'

describe('highlight utils', () => {
  it('should highlight one match', () => {
    expect(highlightTerm('some random string', 'some')).toBe('<em>some</em> random string')
  })

  describe('shouldHighlightField', () => {
    it('should match on exact string', () => {
      expect(shouldHighlightField('title', ['title'])).toBeTruthy()
    })

    it('should match when starts with string', () => {
      expect(shouldHighlightField('actor', ['actor.name.keyword'])).toBeTruthy()
    })

    it('should match on wildcard', () => {
      expect(shouldHighlightField('actor.name.keyword', ['actor.*'])).toBeTruthy()
    })

    it('should not match on unknown fields', () => {
      expect(shouldHighlightField('title', ['actor'])).toBeFalsy()
    })

    it('should match against everything', () => {
      expect(shouldHighlightField('actor.name.keyword', ['*'])).toBeTruthy()
    })

    it('should not match on empty highlightFields', () => {
      expect(shouldHighlightField('title', [])).toBeFalsy()
    })
  })

  describe('getHighlightFields', () => {
    it('should match on a field', () => {
      const hit: ElasticsearchHit = {
        _id: 'test',
        _index: 'index',
        _source: {
          title: 'The Lion King'
        },
        highlight: {
          title: ['The <em>Lion</em> King']
        }
      }

      expect(getHighlightFields(hit, undefined, undefined, ['title'])).toMatchInlineSnapshot(`
        {
          "title": {
            "fullyHighlighted": false,
            "matchLevel": "full",
            "matchedWords": [
              "Lion",
            ],
            "value": "The <ais-highlight-0000000000>Lion<ais-highlight-0000000000/> King",
          },
        }
      `)
    })

    it('should match on a object field', () => {
      const hit: ElasticsearchHit = {
        _index: 'test_index',
        _id: '4b4876e1-5749-4d5f-95b6-2251681c96e1',
        _score: 1.0,
        _source: {
          metadata: {
            publisher: 'Albert Einstein',
            publicationYear: '2023'
          }
        },
        highlight: {
          'metadata.publisher': ['<em>Albert</em> Einstein']
        }
      }

      expect(getHighlightFields(hit, undefined, undefined, ['metadata.publisher']))
        .toMatchInlineSnapshot(`
        {
          "metadata": {
            "publisher": {
              "fullyHighlighted": false,
              "matchLevel": "full",
              "matchedWords": [
                "Albert",
              ],
              "value": "<ais-highlight-0000000000>Albert<ais-highlight-0000000000/> Einstein",
            },
          },
        }
      `)
    })

    it('should match on wildcards', () => {
      const hit: ElasticsearchHit = {
        _id: 'test',
        _index: 'index',
        _source: {
          actor: {
            name: 'Keanu Reeves'
          }
        },
        highlight: {
          ['actor.name.keyword']: ['<em>Keanu</em> Reeves']
        }
      }

      expect(getHighlightFields(hit, undefined, undefined, ['actor.*'])).toMatchInlineSnapshot(`
        {
          "actor": {
            "name": {
              "fullyHighlighted": false,
              "matchLevel": "full",
              "matchedWords": [
                "Keanu",
              ],
              "value": "<ais-highlight-0000000000>Keanu<ais-highlight-0000000000/> Reeves",
            },
          },
        }
      `)
    })
  })

  it('should have matches and source value is an array', () => {
    const hit: ElasticsearchHit = {
      _id: 'test',
      _index: 'index',
      _source: {
        actors: ['Robert De Niro', 'Al Pacino']
      },
      highlight: {
        actors: ['<em>Robert</em> De Niro']
      }
    }

    expect(getHighlightFields(hit, undefined, undefined, ['actors'])).toMatchInlineSnapshot(`
      {
        "actors": [
          {
            "fullyHighlighted": false,
            "matchLevel": "full",
            "matchedWords": [
              "Robert",
            ],
            "value": "<ais-highlight-0000000000>Robert<ais-highlight-0000000000/> De Niro",
          },
          {
            "matchLevel": "none",
            "matchedWords": [],
            "value": "Al Pacino",
          },
        ],
      }
    `)
  })

  it('should have matches and source value is an array of objects', () => {
    const hit: ElasticsearchHit = {
      _id: 'test',
      _index: 'index',
      _source: {
        "actors": [
          {
              "name": "Robert De Niro",
          },
          {
              "name": "Al Pacino",
          }
      ],
      },
      highlight: {
        "actors.name": ['<em>Robert</em> De Niro']
      }
    }

    expect(getHighlightFields(hit, undefined, undefined, ['*'])).toMatchInlineSnapshot(`
      {
        "actors": [
          {
            "name": {
              "fullyHighlighted": false,
              "matchLevel": "full",
              "matchedWords": [
                "Robert",
              ],
              "value": "<ais-highlight-0000000000>Robert<ais-highlight-0000000000/> De Niro",
            },
          },
          {
            "name": {
              "matchLevel": "none",
              "matchedWords": [],
              "value": "Al Pacino",
            },
          },
        ],
      }
    `)
  })

  it('should not have matches and source value is an array', () => {
    const hit: ElasticsearchHit = {
      _id: 'test',
      _index: 'index',
      _source: {
        actors: ['Robert De Niro', 'Al Pacino']
      },
      highlight: {}
    }

    expect(getHighlightFields(hit, undefined, undefined, ['actors'])).toMatchInlineSnapshot(`
      {
        "actors": [
          {
            "matchLevel": "none",
            "matchedWords": [],
            "value": "Robert De Niro",
          },
          {
            "matchLevel": "none",
            "matchedWords": [],
            "value": "Al Pacino",
          },
        ],
      }
    `)
  })

  it('should have no matches', () => {
    const hit: ElasticsearchHit = {
      _id: 'test',
      _index: 'index',
      _source: {
        title: 'The Lion King'
      },
      highlight: {}
    }

    expect(getHighlightFields(hit, undefined, undefined, ['title'])).toMatchInlineSnapshot(`
      {
        "title": {
          "matchLevel": "none",
          "matchedWords": [],
          "value": "The Lion King",
        },
      }
    `)
  })

  it('should have no matches for booleans with wildcards', () => {
    const hit: ElasticsearchHit = {
      _id: 'test',
      _index: 'index',
      _source: {
        is_movie: false
      },
      highlight: {}
    }

    expect(getHighlightFields(hit, undefined, undefined, ['*'])).toMatchInlineSnapshot(`{}`)
  })

  it('should have no matches for nulls wildcards', () => {
    const hit: ElasticsearchHit = {
      _id: 'test',
      _index: 'index',
      _source: {
        title: null
      },
      highlight: {}
    }

    expect(getHighlightFields(hit, undefined, undefined, ['*'])).toMatchInlineSnapshot(`{}`)
  })
})
