import A from 'automerge'
import cuid from 'cuid'

let id = 0
const sequence = () => (id++).toString()

A.uuid.setFactory(sequence)

describe('Automerge', () => {
  test('persistence formats', () => {
    let doc = A.from<any>({
      first: 'Herb',
      last: 'Caudill',
      city: 'Washington',
      state: 'DC',
      country: 'us',
      spouse: null,
      children: [],
    })

    doc = A.change(doc, s => (s.spouse = 'Lynne'))
    doc = A.change(doc, s => s.children.push('Calvin'))
    doc = A.change(doc, s => s.children.push('Baird'))
    doc = A.change(doc, s => {
      s.city = 'Barcelona'
      s.state = null
      s.country = 'es'
    })

    const changes = [
      {
        ops: [
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'first',
            value: 'Herb',
          },
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'last',
            value: 'Caudill',
          },
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'city',
            value: 'Washington',
          },
          { action: 'set', obj: '00000000-0000-0000-0000-000000000000', key: 'state', value: 'DC' },
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'country',
            value: 'us',
          },
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'spouse',
            value: null,
          },
          { action: 'makeList', obj: '1' },
          {
            action: 'link',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'children',
            value: '1',
          },
        ],
        actor: '0',
        seq: 1,
        deps: {},
        message: 'Initialization',
      },
      {
        ops: [
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'spouse',
            value: 'Lynne',
          },
        ],
        actor: '0',
        seq: 2,
        deps: {},
      },
      {
        ops: [
          { action: 'ins', obj: '1', key: '_head', elem: 1 },
          { action: 'set', obj: '1', key: '0:1', value: 'Calvin' },
        ],
        actor: '0',
        seq: 3,
        deps: {},
      },
      {
        ops: [
          { action: 'ins', obj: '1', key: '0:1', elem: 2 },
          { action: 'set', obj: '1', key: '0:2', value: 'Baird' },
        ],
        actor: '0',
        seq: 4,
        deps: {},
      },
      {
        ops: [
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'city',
            value: 'Barcelona',
          },
          { action: 'set', obj: '00000000-0000-0000-0000-000000000000', key: 'state', value: null },
          {
            action: 'set',
            obj: '00000000-0000-0000-0000-000000000000',
            key: 'country',
            value: 'es',
          },
        ],
        actor: '0',
        seq: 5,
        deps: {},
      },
    ]

    const save = [
      {
        change: {
          actor: '0',
          deps: {},
          message: 'Initialization',
          ops: [
            {
              action: 'set',
              key: 'first',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'Herb',
            },
            {
              action: 'set',
              key: 'last',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'Caudill',
            },
            {
              action: 'set',
              key: 'city',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'Washington',
            },
            {
              action: 'set',
              key: 'state',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'DC',
            },
            {
              action: 'set',
              key: 'country',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'us',
            },
            {
              action: 'set',
              key: 'spouse',
              obj: '00000000-0000-0000-0000-000000000000',
              value: null,
            },
            {
              action: 'makeList',
              obj: '1',
            },
            {
              action: 'link',
              key: 'children',
              obj: '00000000-0000-0000-0000-000000000000',
              value: '1',
            },
          ],
          seq: 1,
        },
        snapshot: {
          children: [],
          city: 'Washington',
          country: 'us',
          first: 'Herb',
          last: 'Caudill',
          spouse: null,
          state: 'DC',
        },
      },
      {
        change: {
          actor: '0',
          deps: {},
          ops: [
            {
              action: 'set',
              key: 'spouse',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'Lynne',
            },
          ],
          seq: 2,
        },
        snapshot: {
          children: [],
          city: 'Washington',
          country: 'us',
          first: 'Herb',
          last: 'Caudill',
          spouse: 'Lynne',
          state: 'DC',
        },
      },
      {
        change: {
          actor: '0',
          deps: {},
          ops: [
            {
              action: 'ins',
              elem: 1,
              key: '_head',
              obj: '1',
            },
            {
              action: 'set',
              key: '0:1',
              obj: '1',
              value: 'Calvin',
            },
          ],
          seq: 3,
        },
        snapshot: {
          children: ['Calvin'],
          city: 'Washington',
          country: 'us',
          first: 'Herb',
          last: 'Caudill',
          spouse: 'Lynne',
          state: 'DC',
        },
      },
      {
        change: {
          actor: '0',
          deps: {},
          ops: [
            {
              action: 'ins',
              elem: 2,
              key: '0:1',
              obj: '1',
            },
            {
              action: 'set',
              key: '0:2',
              obj: '1',
              value: 'Baird',
            },
          ],
          seq: 4,
        },
        snapshot: {
          children: ['Calvin', 'Baird'],
          city: 'Washington',
          country: 'us',
          first: 'Herb',
          last: 'Caudill',
          spouse: 'Lynne',
          state: 'DC',
        },
      },
      {
        change: {
          actor: '0',
          deps: {},
          ops: [
            {
              action: 'set',
              key: 'city',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'Barcelona',
            },
            {
              action: 'set',
              key: 'state',
              obj: '00000000-0000-0000-0000-000000000000',
              value: null,
            },
            {
              action: 'set',
              key: 'country',
              obj: '00000000-0000-0000-0000-000000000000',
              value: 'es',
            },
          ],
          seq: 5,
        },
        snapshot: {
          children: ['Calvin', 'Baird'],
          city: 'Barcelona',
          country: 'es',
          first: 'Herb',
          last: 'Caudill',
          spouse: 'Lynne',
          state: null,
        },
      },
    ]

    const history = [
      '~#iL',
      [
        [
          '~#iM',
          [
            'ops',
            [
              '^0',
              [
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'first',
                    'value',
                    'Herb',
                  ],
                ],
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'last',
                    'value',
                    'Caudill',
                  ],
                ],
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'city',
                    'value',
                    'Washington',
                  ],
                ],
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'state',
                    'value',
                    'DC',
                  ],
                ],
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'country',
                    'value',
                    'us',
                  ],
                ],
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'spouse',
                    'value',
                    null,
                  ],
                ],
                ['^1', ['action', 'makeList', 'obj', '1']],
                [
                  '^1',
                  [
                    'action',
                    'link',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'children',
                    'value',
                    '1',
                  ],
                ],
              ],
            ],
            'actor',
            '0',
            'seq',
            1,
            'deps',
            ['^1', []],
            'message',
            'Initialization',
          ],
        ],
        [
          '^1',
          [
            'ops',
            [
              '^0',
              [
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'spouse',
                    'value',
                    'Lynne',
                  ],
                ],
              ],
            ],
            'actor',
            '0',
            'seq',
            2,
            'deps',
            ['^1', []],
          ],
        ],
        [
          '^1',
          [
            'ops',
            [
              '^0',
              [
                ['^1', ['action', 'ins', 'obj', '1', 'key', '_head', 'elem', 1]],
                ['^1', ['action', 'set', 'obj', '1', 'key', '0:1', 'value', 'Calvin']],
              ],
            ],
            'actor',
            '0',
            'seq',
            3,
            'deps',
            ['^1', []],
          ],
        ],
        [
          '^1',
          [
            'ops',
            [
              '^0',
              [
                ['^1', ['action', 'ins', 'obj', '1', 'key', '0:1', 'elem', 2]],
                ['^1', ['action', 'set', 'obj', '1', 'key', '0:2', 'value', 'Baird']],
              ],
            ],
            'actor',
            '0',
            'seq',
            4,
            'deps',
            ['^1', []],
          ],
        ],
        [
          '^1',
          [
            'ops',
            [
              '^0',
              [
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'city',
                    'value',
                    'Barcelona',
                  ],
                ],
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'state',
                    'value',
                    null,
                  ],
                ],
                [
                  '^1',
                  [
                    'action',
                    'set',
                    'obj',
                    '00000000-0000-0000-0000-000000000000',
                    'key',
                    'country',
                    'value',
                    'es',
                  ],
                ],
              ],
            ],
            'actor',
            '0',
            'seq',
            5,
            'deps',
            ['^1', []],
          ],
        ],
      ],
    ]

    expect(A.getChanges(A.init(), doc)).toEqual(changes)
    expect(A.getHistory(doc)).toEqual(save)
    expect(A.save(doc)).toEqual(JSON.stringify(history))

    const size = (obj: any) => JSON.stringify(obj).length

    expect(size(changes)).toBe(1479)
    expect(size(save)).toBe(2190)
    expect(size(history)).toBe(1707)
  })
})
