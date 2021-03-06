import React from 'react'
import { connect } from 'react-redux'
import { gqlConnector } from 'resolve-redux'

import Stories from '../components/Stories'
import { ITEMS_PER_PAGE } from '../constants'

const NewestByPage = ({
  match: { params: { page } },
  data: { stories = [], me, refetch },
  lastVotedStory
}) => (
  <Stories
    refetch={refetch}
    items={stories}
    page={page || '1'}
    type="newest"
    userId={me && me.id}
    lastVotedStory={lastVotedStory}
  />
)

const mapStateToProps = ({ ui: { lastVotedStory } }) => ({
  lastVotedStory
})

export default gqlConnector(
  `
    query($first: Int!, $offset: Int) {
      stories(first: $first, offset: $offset) {
        id
        type
        title
        link
        commentCount
        votes
        createdAt
        createdBy
        createdByName
      }
      me {
        id
      }
    }
  `,
  {
    options: ({ match: { params: { page = 1 } } }) => ({
      variables: {
        first: ITEMS_PER_PAGE + 1,
        offset: (+page - 1) * ITEMS_PER_PAGE
      },
      fetchPolicy: 'network-only'
    })
  }
)(connect(mapStateToProps)(NewestByPage))
