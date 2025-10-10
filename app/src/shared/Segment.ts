import { Allow, Entity, Fields } from "remult";

@Entity("segments", {
  allowApiCrud: Allow.authenticated,
})
export class Segment {
  @Fields.id()
  id = "";

  @Fields.string()
  title = "";

  @Fields.string()
  content = "";

  @Fields.string()
  status = "";

  @Fields.createdAt()
  createdAt = new Date();
}
