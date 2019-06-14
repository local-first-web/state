import { createFeed, initialize } from 'cevitxe'
//import { applyMiddleware } from 'redux'
import { key, secretKey } from '../secrets'
import { reducer } from './reducers'
import { VisibilityFilter } from 'src/types';



const feed = createFeed({ key, secretKey })

const initialState = initialize({
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
})
// const enhancers = {}; // Use redux compose for custom middlewares

export const store = feed.createStore(reducer, initialState);
//   reducer,
//   initialState,
//   enhancers
// )

// create a feed around our redux store
