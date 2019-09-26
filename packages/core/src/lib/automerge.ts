import A from 'automerge'
import cuid from 'cuid'

A.uuid.setFactory(cuid.slug)
export default A
