import { Entity, Fields } from "remult";

@Entity("segments", {
  allowApiCrud: true,
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
