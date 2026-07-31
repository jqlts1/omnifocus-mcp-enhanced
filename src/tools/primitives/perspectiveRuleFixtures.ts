/**
 * Rule archives captured from a real OmniFocus 4.8.12 database.
 *
 * These are the exact structures the app produces, including nested
 * aggregation, rules disabled through the UI, focus references, dynamic date
 * specifications, and the planned-date rules that Omni's published
 * documentation omits. They exist so the translator is tested against what
 * OmniFocus actually writes rather than against hand-written guesses.
 *
 * Perspective names are anonymised; rule contents are verbatim.
 */
export interface PerspectiveRuleFixture {
  name: string;
  aggregation: string | null;
  rules: Record<string, unknown>[];
}

export const PERSPECTIVE_RULE_FIXTURES: PerspectiveRuleFixture[] =
[
  {
    "name": "perspective-1",
    "aggregation": "all",
    "rules": [
      {
        "disabledRule": {
          "actionHasAnyOfTags": [
            "kUBJxPDybXu"
          ]
        }
      },
      {
        "aggregateRules": [
          {
            "aggregateRules": [
              {
                "actionDateField": "defer",
                "actionDateIsToday": true
              },
              {
                "actionAvailability": "remaining"
              }
            ],
            "aggregateType": "all"
          },
          {
            "actionAvailability": "available"
          }
        ],
        "aggregateType": "any"
      },
      {
        "aggregateRules": [
          {
            "actionIsProjectOrGroup": true
          },
          {
            "actionStatus": "flagged"
          }
        ],
        "aggregateType": "none"
      }
    ]
  },
  {
    "name": "perspective-2",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "remaining"
      },
      {
        "actionWithinFocus": [
          "lMQwZVzxz-g",
          "lgSxcfPmrmI"
        ]
      },
      {
        "aggregateRules": [
          {
            "actionIsProjectOrGroup": true
          },
          {
            "actionAvailability": "available"
          },
          {
            "actionDateField": "defer",
            "actionDateIsToday": true
          },
          {
            "actionStatus": "flagged"
          }
        ],
        "aggregateType": "none"
      },
      {
        "aggregateRules": [
          {
            "actionDateField": "defer",
            "actionDateIsInTheNext": {
              "relativeAfterAmount": 3,
              "relativeComponent": "day"
            }
          },
          {
            "aggregateRules": [
              {
                "actionHasDeferDate": true
              }
            ],
            "aggregateType": "none"
          }
        ],
        "aggregateType": "any"
      }
    ]
  },
  {
    "name": "perspective-3",
    "aggregation": "all",
    "rules": [
      {
        "actionWithinFocus": [
          "lMQwZVzxz-g",
          "lgSxcfPmrmI"
        ]
      },
      {
        "aggregateRules": [
          {
            "actionDateField": "defer",
            "actionDateIsAfterDateSpec": {
              "dynamic": "tom"
            },
            "actionDateIsBeforeDateSpec": {}
          },
          {
            "actionIsProjectOrGroup": true
          },
          {
            "actionWithinFocus": [
              "iyZoDO45RPt"
            ]
          },
          {
            "actionHasAnyOfTags": [
              "aOl1CY9ZNnr"
            ]
          }
        ],
        "aggregateType": "none"
      },
      {
        "aggregateRules": [
          {
            "aggregateRules": [
              {
                "actionAvailability": "remaining"
              },
              {
                "aggregateRules": [
                  {
                    "actionDateField": "planned",
                    "actionDateIsAfterDateSpec": {},
                    "actionDateIsBeforeDateSpec": {
                      "dynamic": "today"
                    }
                  },
                  {
                    "actionDateField": "defer",
                    "actionDateIsAfterDateSpec": {},
                    "actionDateIsBeforeDateSpec": {
                      "dynamic": "today"
                    }
                  },
                  {
                    "aggregateRules": [
                      {
                        "actionHasPlannedDate": true
                      }
                    ],
                    "aggregateType": "none"
                  }
                ],
                "aggregateType": "any"
              }
            ],
            "aggregateType": "all"
          },
          {
            "aggregateRules": [
              {
                "actionDateField": "completed",
                "actionDateIsToday": true
              }
            ],
            "aggregateType": "all"
          }
        ],
        "aggregateType": "any"
      }
    ]
  },
  {
    "name": "perspective-4",
    "aggregation": null,
    "rules": [
      {
        "disabledRule": {
          "actionAvailability": "remaining"
        }
      }
    ]
  },
  {
    "name": "perspective-5",
    "aggregation": null,
    "rules": [
      {
        "actionAvailability": "completed"
      }
    ]
  },
  {
    "name": "perspective-6",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "completed"
      },
      {
        "actionDateField": "completed",
        "actionDateIsInThePast": {
          "relativeBeforeAmount": 1,
          "relativeComponent": "week"
        }
      },
      {
        "actionWithinFocus": [
          "lMQwZVzxz-g",
          "lgSxcfPmrmI"
        ]
      },
      {
        "actionDateField": "completed",
        "actionDateIsAfterDateSpec": {
          "dynamic": "this week"
        },
        "actionDateIsBeforeDateSpec": {
          "dynamic": "this week"
        }
      }
    ]
  },
  {
    "name": "perspective-7",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "completed"
      }
    ]
  },
  {
    "name": "perspective-8",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "completed"
      },
      {
        "actionDateField": "completed",
        "actionDateIsToday": true
      },
      {
        "actionWithinFocus": [
          "lMQwZVzxz-g"
        ]
      }
    ]
  },
  {
    "name": "perspective-9",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "completed"
      },
      {
        "actionDateField": "completed",
        "actionDateIsInThePast": {
          "relativeBeforeAmount": 3,
          "relativeComponent": "day"
        }
      }
    ]
  },
  {
    "name": "perspective-10",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "available"
      },
      {
        "aggregateRules": [
          {
            "actionIsProjectOrGroup": true
          },
          {
            "actionWithinFocus": [
              "iyZoDO45RPt"
            ]
          }
        ],
        "aggregateType": "none"
      }
    ]
  },
  {
    "name": "perspective-11",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "remaining"
      },
      {
        "actionHasAnyOfTags": [
          "kiMYK_vaqqG"
        ]
      }
    ]
  },
  {
    "name": "perspective-12",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "available"
      },
      {
        "actionHasAnyOfTags": [
          "khKYROM6M6x"
        ]
      }
    ]
  },
  {
    "name": "perspective-13",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "completed"
      },
      {
        "actionDateField": "completed",
        "actionDateIsInThePast": {
          "relativeBeforeAmount": 1,
          "relativeComponent": "week"
        }
      },
      {
        "actionWithinFocus": [
          "lMQwZVzxz-g"
        ]
      }
    ]
  },
  {
    "name": "perspective-14",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "remaining"
      },
      {
        "actionHasAnyOfTags": [
          "dqrogcT_AtM"
        ]
      },
      {
        "actionIsGroup": true
      }
    ]
  },
  {
    "name": "perspective-15",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "completed"
      },
      {
        "actionDateField": "completed",
        "actionDateIsYesterday": true
      },
      {
        "actionWithinFocus": [
          "lMQwZVzxz-g"
        ]
      }
    ]
  },
  {
    "name": "perspective-16",
    "aggregation": "all",
    "rules": [
      {
        "actionAvailability": "remaining"
      },
      {
        "actionWithinFocus": [
          "lMQwZVzxz-g"
        ]
      },
      {
        "aggregateRules": [
          {
            "actionIsProjectOrGroup": true
          }
        ],
        "aggregateType": "none"
      },
      {
        "actionDateField": "defer",
        "actionDateIsTomorrow": true
      }
    ]
  }
];
