import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ContextDoc extends BaseDoc {
  parent: ObjectId;
  content: string;
  author?: ObjectId;
}

export default class ContextConcept {
  public readonly contexts = new DocCollection<ContextDoc>("contexts");

  async create(parent: ObjectId, content: string, author?: ObjectId) {
    if (author !== undefined) {
      await this.alreadySubmittedContext(parent, author);
    }
    const _id = await this.contexts.createOne({ parent, content, author });
    return { msg: "Context successfully created!", context: await this.contexts.readOne({ _id }) };
  }

  async isContext(_id: ObjectId) {
    const ctx = await this.contexts.readOne({ _id });
    if (!ctx) {
      throw new NotFoundError(`Item with ${_id} not found in contexts!`);
    }
  }

  async getContexts(query: Filter<ContextDoc>) {
    const contexts = await this.contexts.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return contexts;
  }

  async getByParent(parent: ObjectId) {
    return await this.getContexts({ parent });
  }

  async getById(_id: ObjectId) {
    return await this.contexts.readOne({ _id });
  }

  async update(_id: ObjectId, update: Partial<ContextDoc>) {
    this.sanitizeUpdate(update);
    await this.contexts.updateOne({ _id }, update);
    return { msg: "Context successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.contexts.deleteOne({ _id });
    return { msg: "Context deleted successfully!" };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const context = await this.contexts.readOne({ _id });
    if (!context) {
      throw new NotFoundError(`Context ${_id} does not exist!`);
    }

    if (!context.author) {
        throw new ContextAuthorNotMatchError(user, _id);
    }
    
    if (context.author.toString() !== user.toString()) {
      throw new ContextAuthorNotMatchError(user, _id);
    }
  }

  async alreadySubmittedContext(parent: ObjectId, user: ObjectId) {
    const maybeContext = await this.contexts.readOne({ "parent": parent, "author": user });
    if (maybeContext) {
        throw new ContextAlreadySubmittedError(user, parent);
    }
  }

  private sanitizeUpdate(update: Partial<ContextDoc>) {
    // Make sure the update cannot change the author or the parent.
    const allowedUpdates = ["content"];
    for (const key in update) {
      if (!allowedUpdates.includes(key)) {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}

export class ContextAlreadySubmittedError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} has already submitted a context to post {1}!", author, _id);
    }
  }

export class ContextAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of context {1}!", author, _id);
  }
}
